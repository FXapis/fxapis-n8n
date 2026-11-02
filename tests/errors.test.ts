/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import test from 'node:test';
import { failureFrom, failureText, redact } from '../nodes/Fxapis/lib/errors.ts';
import { assertApiBase } from '../nodes/Fxapis/lib/url.ts';
import { verifyWebhook } from '../nodes/Fxapis/lib/signature.ts';

test('redacts keys, secrets and passwords', () => {
	assert.equal(
		redact('key fx_live_abc and whsec_secret and "password":"hunter2"'),
		'key [redacted key] and [redacted secret] and "password":"[redacted]"',
	);
});

test('an unresolved order is never retryable', () => {
	const failure = failureFrom(503, {
		error: { code: 'ORDER_UNRESOLVED', message: 'unknown' },
		requestId: 'req_1',
	});
	assert.equal(failure.retryable, false);
	assert.match(failureText(failure), /Do not resend/);
	assert.match(failureText(failure), /req_1/);
});

test('a send failure may be retried with the same key', () => {
	assert.equal(
		failureFrom(503, { error: { code: 'SEND_FAILED', message: 'nothing sent' } }).retryable,
		true,
	);
});

test('codes follow the API error catalogue', () => {
	assert.equal(
		failureFrom(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } }).retryable,
		false,
	);
	assert.equal(
		failureFrom(403, { error: { code: 'MISSING_SCOPE', message: 'x' } }).retryable,
		false,
	);
	assert.equal(
		failureFrom(503, { error: { code: 'COPY_TRADING_PAUSED', message: 'x' } }).retryable,
		false,
	);
	assert.equal(
		failureFrom(503, { error: { code: 'MT5_UNAVAILABLE', message: 'x' } }).retryable,
		true,
	);
	assert.equal(
		failureFrom(409, { error: { code: 'IDEMPOTENCY_IN_FLIGHT', message: 'x' } }).retryable,
		true,
	);
	assert.equal(failureFrom(502, 'bad gateway').code, 'GATEWAY_ERROR');
	assert.equal(failureFrom(502, 'bad gateway').retryable, true);
});

test('a rejection is retryable only when the API says so', () => {
	const rejected = (retryable: boolean) =>
		failureFrom(422, { error: { code: 'ORDER_REJECTED', message: 'x', details: [{ retryable }] } });
	assert.equal(rejected(true).retryable, true);
	assert.equal(rejected(false).retryable, false);
});

test('retry-after is read in seconds', () => {
	assert.equal(
		failureFrom(429, { error: { code: 'RATE_LIMITED', message: 'x' } }, '7').retryAfter,
		7,
	);
	assert.equal(
		failureFrom(429, { error: { code: 'RATE_LIMITED', message: 'x' } }, 'soon').retryAfter,
		undefined,
	);
});

test('the API base must be public HTTPS', () => {
	assert.equal(assertApiBase(undefined), 'https://api.fxapis.com');
	assert.equal(assertApiBase('https://api.fxapis.com/'), 'https://api.fxapis.com');
	assert.throws(() => assertApiBase('http://api.fxapis.com'), /HTTPS/);
	assert.throws(() => assertApiBase('https://user:pw@api.fxapis.com'), /username/);
	for (const host of [
		'127.0.0.1',
		'127.1.2.3',
		'2130706433',
		'0x7f000001',
		'0.0.0.0',
		'10.0.0.1',
		'172.16.0.1',
		'192.168.1.1',
		'169.254.169.254',
		'100.64.0.1',
		'localhost',
		'api.localhost',
		'printer.local',
		'metadata.google.internal',
		'db.internal',
		'intranet',
		'[::1]',
		'[::]',
		'[fd00::1]',
		'[fc12:3456::1]',
		'[fe80::1]',
		'[::ffff:127.0.0.1]',
		'[::ffff:10.0.0.1]',
	]) {
		assert.throws(() => assertApiBase(`https://${host}`), /private/, host);
	}
	assert.equal(assertApiBase('https://[2606:4700::1111]'), 'https://[2606:4700::1111]');
	assert.equal(assertApiBase('https://8.8.8.8'), 'https://8.8.8.8');
});

test('a webhook signature matches the raw body', async () => {
	const secret = 'whsec_test';
	const body = '{"id":"evt_1"}';
	const timestamp = 1_700_000_000;
	const expected = await hmac(secret, `${timestamp}.${body}`);
	const event = await verifyWebhook(body, `t=${timestamp},v1=${expected}`, secret, {
		now: timestamp * 1000,
	});
	assert.deepEqual(event, { id: 'evt_1' });
	await assert.rejects(
		verifyWebhook(body, `t=${timestamp},v1=00`, secret, { now: timestamp * 1000 }),
	);
});

test('signature edge cases', async () => {
	const secret = 'whsec_test';
	const body = '{"id":"evt_1","type":"order.filled"}';
	const t = 1_700_000_000;
	const now = t * 1000;
	const good = await hmac(secret, `${t}.${body}`);
	const old = await hmac('whsec_old', `${t}.${body}`);
	await assert.rejects(verifyWebhook(body, undefined, secret, { now }), /missing/);
	await assert.rejects(verifyWebhook(body, 'garbage', secret, { now }), /malformed/);
	await assert.rejects(verifyWebhook(body, `v1=${good}`, secret, { now }), /malformed/);
	await assert.rejects(verifyWebhook(body, `t=${t}`, secret, { now }), /malformed/);
	await assert.rejects(verifyWebhook(body, `t=${t}.5,v1=${good}`, secret, { now }), /malformed/);
	await assert.rejects(
		verifyWebhook(body, `t=${t},v1=${good}`, secret, { now: now + 301_000 }),
		/tolerance/,
	);
	await assert.rejects(
		verifyWebhook(body, `t=${t},v1=${good}`, secret, { now: now - 301_000 }),
		/tolerance/,
	);
	assert.ok(await verifyWebhook(body, `t=${t},v1=${good}`, secret, { now: now + 299_000 }));
	await assert.rejects(
		verifyWebhook(`${body} `, `t=${t},v1=${good}`, secret, { now }),
		/does not match/,
	);
	await assert.rejects(
		verifyWebhook(body, `t=${t},v1=${good}`, 'whsec_other', { now }),
		/does not match/,
	);
	await assert.rejects(
		verifyWebhook(body, `t=${t},v1=${good.toUpperCase()}`, secret, { now }),
		/does not match/,
	);
	assert.ok(
		await verifyWebhook(body, `t=${t}, v1=${old}, v1=${good}`, secret, { now }),
		'either v1 matches during a rotation',
	);
	assert.ok(
		await verifyWebhook(body, `t=${t},v0=abc,v1=${good}`, secret, { now }),
		'unknown schemes are ignored',
	);
});

async function hmac(secret: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
	return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
