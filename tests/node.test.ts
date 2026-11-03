/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import test from 'node:test';
import { NodeApiError } from 'n8n-workflow';
import { Fxapis } from '../nodes/Fxapis/Fxapis.node.ts';
import { fakeContext, path, type Call } from './fake.ts';

type Execute = (
	this: unknown,
) => Promise<Array<Array<{ json: Record<string, unknown>; pairedItem?: unknown }>>>;
const execute = new Fxapis().execute as unknown as Execute;

test('a list operation outputs one item per record, following the cursor', async () => {
	const context = fakeContext({
		params: {
			resource: 'order',
			operation: 'list',
			returnAll: true,
			filters: { state: 'unknown' },
		},
		route: (call: Call) =>
			call.qs?.cursor
				? { body: { data: [{ id: 'o3' }], page: { hasMore: false, nextCursor: null } } }
				: {
						body: { data: [{ id: 'o1' }, { id: 'o2' }], page: { hasMore: true, nextCursor: 'c2' } },
					},
	});
	const [items] = await execute.call(context);
	assert.deepEqual(
		items.map((item) => item.json.id),
		['o1', 'o2', 'o3'],
	);
	assert.deepEqual(items[0].pairedItem, { item: 0 });
	assert.deepEqual(
		context.calls.map((call) => call.qs),
		[
			{ state: 'unknown', limit: 200 },
			{ state: 'unknown', limit: 200, cursor: 'c2' },
		],
	);
});

test('Limit cuts a list that has no paging', async () => {
	const context = fakeContext({
		params: { resource: 'account', operation: 'list', returnAll: false, limit: 1 },
		route: () => ({ body: { data: [{ id: 'a1' }, { id: 'a2' }] } }),
	});
	const [items] = await execute.call(context);
	assert.deepEqual(
		items.map((item) => item.json.id),
		['a1'],
	);
	assert.equal(path(context.calls[0]), '/v1/accounts');
});

test('a single read is one item, unwrapped from data', async () => {
	const context = fakeContext({
		params: { resource: 'account', operation: 'get', accountId: 'a1' },
		route: () => ({ body: { data: { id: 'a1', state: 'ready' } } }),
	});
	const [items] = await execute.call(context);
	assert.deepEqual(
		items.map((item) => item.json),
		[{ id: 'a1', state: 'ready' }],
	);
});

test('a null answer is still one item', async () => {
	const context = fakeContext({
		params: { resource: 'billing', operation: 'subscription' },
		route: () => ({ body: { data: null } }),
	});
	const [items] = await execute.call(context);
	assert.deepEqual(
		items.map((item) => item.json),
		[{ data: null }],
	);
});

test('a market order sends the idempotency key and no default deviation', async () => {
	const context = fakeContext({
		params: {
			resource: 'order',
			operation: 'market',
			accountId: 'a1',
			naming: 'symbol',
			marketName: 'EURUSD',
			side: 'buy',
			volume: '0.01',
			idempotencyKey: 'sig-1',
			additionalFields: {},
		},
		route: () => ({ status: 201, body: { data: { id: 'o1', state: 'filled' } } }),
	});
	await execute.call(context);
	assert.equal(context.calls[0].headers?.['Idempotency-Key'], 'sig-1');
	assert.deepEqual(context.calls[0].body, { symbol: 'EURUSD', side: 'buy', volume: '0.01' });
});

test('connect reads login, server and password from the MT5 credential', async () => {
	const context = fakeContext({
		params: {
			resource: 'account',
			operation: 'connect',
			mode: 'warm_on_demand',
			additionalFields: { label: 'demo' },
		},
		credentials: {
			fxapisMt5LoginApi: { login: ' 51234567 ', server: 'Broker-Demo', password: 'pw' },
		},
		route: () => ({ status: 201, body: { data: { id: 'a1' } } }),
	});
	await execute.call(context);
	assert.deepEqual(context.calls[0].body, {
		mode: 'warm_on_demand',
		label: 'demo',
		login: '51234567',
		server: 'Broker-Demo',
		password: 'pw',
	});
});

test('with Continue On Fail, an API error becomes an error item with its code, status and request ID', async () => {
	const context = fakeContext({
		continueOnFail: true,
		params: [
			{ resource: 'order', operation: 'get', orderId: 'missing' },
			{ resource: 'account', operation: 'status', accountId: 'a1' },
		],
		route: (call: Call) =>
			path(call).startsWith('/v1/orders')
				? {
						status: 503,
						body: {
							error: { code: 'ORDER_UNRESOLVED', message: 'not known yet' },
							requestId: 'req_9',
						},
					}
				: {
						status: 429,
						body: { error: { code: 'RATE_LIMITED', message: 'slow down' }, requestId: 'req_10' },
						headers: { 'retry-after': '3' },
					},
	});
	const [items] = await execute.call(context);
	assert.deepEqual(items[0].json, {
		error: {
			code: 'ORDER_UNRESOLVED',
			message: 'not known yet',
			status: 503,
			requestId: 'req_9',
			retryable: false,
			retryAfter: null,
		},
	});
	assert.deepEqual(items[1].json, {
		error: {
			code: 'RATE_LIMITED',
			message: 'slow down',
			status: 429,
			requestId: 'req_10',
			retryable: true,
			retryAfter: 3,
		},
	});
	assert.deepEqual(items[1].pairedItem, { item: 1 });
});

test('without Continue On Fail, the API error keeps its HTTP code and guidance', async () => {
	const context = fakeContext({
		params: { resource: 'workspace', operation: 'get' },
		route: () => ({
			status: 401,
			body: {
				error: { code: 'UNAUTHENTICATED', message: 'Missing or invalid API key.' },
				requestId: 'req_1',
			},
		}),
	});
	await assert.rejects(execute.call(context), (error: unknown) => {
		assert.ok(error instanceof NodeApiError);
		assert.equal(error.httpCode, '401');
		assert.equal(error.message, 'UNAUTHENTICATED: Missing or invalid API key.');
		assert.match(String(error.description), /Check the API key/);
		assert.match(String(error.description), /req_1/);
		return true;
	});
});

test('a parameter problem is reported against the item without calling the API', async () => {
	const context = fakeContext({
		continueOnFail: true,
		params: {
			resource: 'order',
			operation: 'market',
			accountId: 'a1',
			naming: 'symbol',
			marketName: 'EURUSD',
			side: 'buy',
			volume: '0.01',
			idempotencyKey: '',
			additionalFields: {},
		},
		route: () => ({ body: {} }),
	});
	const [items] = await execute.call(context);
	assert.equal((items[0].json.error as Record<string, unknown>).code, 'INVALID_PARAMETER');
	assert.equal(context.calls.length, 0);
});

test('a private API base URL is refused before the key is sent', async () => {
	const context = fakeContext({
		continueOnFail: true,
		params: { resource: 'workspace', operation: 'get' },
		credentials: { fxapisApi: { apiKey: 'fx_test_x', baseUrl: 'https://[::1]' } },
		route: () => ({ body: {} }),
	});
	const [items] = await execute.call(context);
	assert.match(String((items[0].json.error as Record<string, unknown>).message), /private host/);
	assert.equal(context.calls.length, 0);
});

test('the MT5 login credential is required only where it is used', () => {
	const credentials = new Fxapis().description.credentials ?? [];
	const mt5 = credentials.find((item) => item.name === 'fxapisMt5LoginApi');
	assert.deepEqual(mt5?.displayOptions?.show, {
		resource: ['account'],
		operation: ['connect', 'updatePassword'],
	});
	assert.equal(mt5?.required, true);
});

test('the code, status and request ID survive n8n wrapping the HTTP error', async () => {
	const context = fakeContext({
		continueOnFail: true,
		wrapErrors: true,
		params: { resource: 'account', operation: 'status', accountId: 'a1' },
		route: () => ({
			status: 429,
			body: { error: { code: 'RATE_LIMITED', message: 'slow down' }, requestId: 'req_10' },
			headers: { 'retry-after': '3' },
		}),
	});
	const [items] = await execute.call(context);
	assert.deepEqual(items[0].json, {
		error: {
			code: 'RATE_LIMITED',
			message: 'slow down',
			status: 429,
			requestId: 'req_10',
			retryable: true,
			retryAfter: null,
		},
	});
});

test('a network failure is reported as unreachable', async () => {
	const context = fakeContext({
		continueOnFail: true,
		params: { resource: 'workspace', operation: 'get' },
		route: () => ({ body: {} }),
	});
	context.helpers.httpRequestWithAuthentication = async () => {
		throw new Error('getaddrinfo ENOTFOUND api.fxapis.com');
	};
	const [items] = await execute.call(context);
	assert.equal((items[0].json.error as Record<string, unknown>).code, 'REQUEST_FAILED');
	assert.match(
		String((items[0].json.error as Record<string, unknown>).message),
		/could not be reached/,
	);
});

test('closing a multi-account order sends the key and outputs the per-account results as one item', async () => {
	const result = {
		waveId: 'w1',
		summary: { total: 2, closed: 1, notFound: 0, rejected: 0, unresolved: 0, skipped: 1 },
		legs: [
			{ accountId: 'a1', result: 'closed', closeOrderId: 'o9' },
			{ accountId: 'a2', result: 'skipped', closeOrderId: null },
		],
	};
	const context = fakeContext({
		params: {
			resource: 'wave',
			operation: 'close',
			waveId: 'w1',
			idempotencyKey: 'close:sig-1',
			additionalFields: {},
		},
		route: () => ({ body: { data: result } }),
	});
	const [items] = await execute.call(context);
	assert.equal(
		`${context.calls[0].method} ${path(context.calls[0])}`,
		'POST /v1/execution-waves/w1/close',
	);
	assert.equal(context.calls[0].headers?.['Idempotency-Key'], 'close:sig-1');
	assert.deepEqual(context.calls[0].body, {});
	assert.deepEqual(
		items.map((item) => item.json),
		[result],
	);
});

test('retrying a multi-account order before it has ended comes out as WAVE_NOT_ENDED', async () => {
	const context = fakeContext({
		continueOnFail: true,
		params: {
			resource: 'wave',
			operation: 'retry',
			waveId: 'w1',
			idempotencyKey: 'retry:sig-1',
			additionalFields: { include: ['skipped'] },
		},
		route: () => ({
			status: 409,
			body: { error: { code: 'WAVE_NOT_ENDED', message: 'releasing' }, requestId: 'req_r' },
		}),
	});
	const [items] = await execute.call(context);
	assert.equal(path(context.calls[0]), '/v1/execution-waves/w1/retry');
	assert.equal(context.calls[0].headers?.['Idempotency-Key'], 'retry:sig-1');
	assert.deepEqual(context.calls[0].body, { include: ['skipped'] });
	assert.deepEqual(items[0].json.error, {
		code: 'WAVE_NOT_ENDED',
		message: 'releasing',
		status: 409,
		requestId: 'req_r',
		retryable: false,
		retryAfter: null,
	});
});
