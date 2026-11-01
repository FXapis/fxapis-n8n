/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import test from 'node:test';
import { failureFrom, failureText, redact } from '../nodes/Fxapis/lib/errors.ts';
import { assertApiBase } from '../nodes/Fxapis/lib/url.ts';
import { verifyWebhook } from '../nodes/Fxapis/lib/signature.ts';

test('redacts keys, secrets and passwords', () => {
	assert.equal(redact('key fx_live_abc and whsec_secret and "password":"hunter2"'), 'key [redacted key] and [redacted secret] and "password":"[redacted]"');
});

test('an unresolved order is never retryable', () => {
	const failure = failureFrom(503, { error: { code: 'ORDER_UNRESOLVED', message: 'unknown' }, requestId: 'req_1' });
	assert.equal(failure.retryable, false);
	assert.match(failureText(failure), /Do not resend/);
	assert.match(failureText(failure), /req_1/);
});

test('a send failure may be retried with the same key', () => {
	const failure = failureFrom(503, { error: { code: 'SEND_FAILED', message: 'nothing sent' } });
	assert.equal(failure.retryable, true);
});

test('the API base must be public HTTPS', () => {
	assert.equal(assertApiBase(undefined), 'https://api.fxapis.com');
	assert.throws(() => assertApiBase('http://api.fxapis.com'), /HTTPS/);
	assert.throws(() => assertApiBase('https://127.0.0.1'), /private/);
});

test('a webhook signature matches the raw body', async () => {
	const secret = 'whsec_test';
	const body = '{"id":"evt_1"}';
	const timestamp = 1_700_000_000;
	const expected = await hmac(secret, `${timestamp}.${body}`);
	const event = await verifyWebhook(body, `t=${timestamp},v1=${expected}`, secret, { now: timestamp * 1000 });
	assert.deepEqual(event, { id: 'evt_1' });
	await assert.rejects(verifyWebhook(body, `t=${timestamp},v1=00`, secret, { now: timestamp * 1000 }));
});

async function hmac(secret: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
	return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
