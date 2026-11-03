/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import test from 'node:test';
import { operationFor, type Operation } from '../nodes/Fxapis/catalog.ts';
import { buildRequest } from '../nodes/Fxapis/lib/request.ts';

function op(resource: string, operation: string): Operation {
	const found = operationFor(resource, operation);
	assert.ok(found, `${resource}.${operation}`);
	return found;
}

function reader(params: Record<string, unknown>) {
	return (name: string) => params[name];
}

const market = {
	accountId: 'acc 1',
	naming: 'symbol',
	marketName: 'EURUSD',
	side: 'buy',
	volume: '0.01',
	idempotencyKey: 'sig-1',
};

test('a market order sends only the required fields and the fields added', () => {
	const request = buildRequest(op('order', 'market'), reader({ ...market, additionalFields: {} }));
	assert.equal(request.path, '/v1/accounts/acc%201/orders/market');
	assert.deepEqual(request.body, { symbol: 'EURUSD', side: 'buy', volume: '0.01' });
	assert.equal('deviationPoints' in (request.body ?? {}), false);
	assert.equal(request.idempotencyKey, 'sig-1');
	assert.equal(request.query, undefined);
});

test('additional fields are sent when added, including a deviation of zero', () => {
	const request = buildRequest(
		op('order', 'market'),
		reader({
			...market,
			naming: 'instrument',
			marketName: 'XAUUSD',
			additionalFields: { deviationPoints: 0, stopLoss: '1.07', comment: '' },
		}),
	);
	assert.deepEqual(request.body, {
		instrument: 'XAUUSD',
		side: 'buy',
		volume: '0.01',
		deviationPoints: 0,
		stopLoss: '1.07',
	});
});

test('an order without an idempotency key is refused before it is sent', () => {
	assert.throws(
		() => buildRequest(op('order', 'market'), reader({ ...market, idempotencyKey: '  ' })),
		/Idempotency Key/,
	);
});

test('a pending order takes stops, expiry and references', () => {
	const request = buildRequest(
		op('order', 'pending'),
		reader({
			...market,
			kind: 'stop_limit',
			price: '1.1',
			additionalFields: {
				stopLimitPrice: '1.09',
				stopLoss: '1.0',
				takeProfit: '1.2',
				expiresAt: '2026-11-01T18:00:00Z',
				clientOrderId: 'c-1',
			},
		}),
	);
	assert.deepEqual(request.body, {
		symbol: 'EURUSD',
		side: 'buy',
		kind: 'stop_limit',
		volume: '0.01',
		price: '1.1',
		stopLimitPrice: '1.09',
		stopLoss: '1.0',
		takeProfit: '1.2',
		expiresAt: '2026-11-01T18:00:00Z',
		clientOrderId: 'c-1',
	});
});

test('a close with nothing added sends an empty body and closes the whole position', () => {
	const request = buildRequest(
		op('position', 'close'),
		reader({ accountId: 'a', positionId: '123', idempotencyKey: 'k', additionalFields: {} }),
	);
	assert.equal(request.path, '/v1/accounts/a/positions/123/close');
	assert.deepEqual(request.body, {});
});

test('a close takes a partial volume, deviation, comment and reference', () => {
	const request = buildRequest(
		op('position', 'close'),
		reader({
			accountId: 'a',
			positionId: '123',
			idempotencyKey: 'k',
			additionalFields: { volume: '0.5', deviationPoints: 30, comment: 'tp', clientOrderId: 'x' },
		}),
	);
	assert.deepEqual(request.body, {
		volume: '0.5',
		deviationPoints: 30,
		comment: 'tp',
		clientOrderId: 'x',
	});
});

test('removing a stop or a target sends null, and a value plus a removal is refused', () => {
	const modify = op('position', 'modify');
	assert.deepEqual(
		buildRequest(
			modify,
			reader({
				accountId: 'a',
				positionId: '1',
				updateFields: { removeStopLoss: true, takeProfit: '1.2' },
			}),
		).body,
		{ stopLoss: null, takeProfit: '1.2' },
	);
	assert.deepEqual(
		buildRequest(
			modify,
			reader({
				accountId: 'a',
				positionId: '1',
				updateFields: { removeStopLoss: false, removeTakeProfit: true },
			}),
		).body,
		{ takeProfit: null },
	);
	assert.throws(
		() =>
			buildRequest(
				modify,
				reader({
					accountId: 'a',
					positionId: '1',
					updateFields: { stopLoss: '1.0', removeStopLoss: true },
				}),
			),
		/both set/,
	);
	const pending = op('order', 'modify');
	assert.deepEqual(
		buildRequest(
			pending,
			reader({ orderId: 'o', updateFields: { price: '1.1', removeTakeProfit: true } }),
		).body,
		{ price: '1.1', takeProfit: null },
	);
});

test('query values: booleans as text, filters only when added, renamed keys and lists', () => {
	assert.deepEqual(
		buildRequest(op('account', 'figures'), reader({ accountId: 'a', options: { fresh: true } }))
			.query,
		{ fresh: 'true' },
	);
	assert.equal(
		buildRequest(op('account', 'figures'), reader({ accountId: 'a', options: {} })).query,
		undefined,
	);
	assert.deepEqual(
		buildRequest(
			op('event', 'list'),
			reader({
				filters: { types: ['order.filled', 'position.closed'], accountId: 'a1', undelivered: true },
			}),
		).query,
		{ type: 'order.filled,position.closed', account_id: 'a1', delivery_status: 'failed' },
	);
	assert.deepEqual(
		buildRequest(op('event', 'list'), reader({ filters: { undelivered: false } })).query,
		undefined,
	);
	assert.deepEqual(buildRequest(op('brokerServer', 'list'), reader({ search: 'vantage' })).query, {
		q: 'vantage',
	});
	assert.deepEqual(
		buildRequest(
			op('market', 'quotes'),
			reader({ accountId: 'a', quoteNaming: 'instruments', quoteNames: 'EURUSD,XAUUSD' }),
		).query,
		{ instruments: 'EURUSD,XAUUSD' },
	);
	assert.deepEqual(
		buildRequest(
			op('market', 'candles'),
			reader({
				accountId: 'a',
				naming: 'symbol',
				marketName: 'EURUSD',
				timeframe: 'M5',
				options: { count: 10 },
			}),
		).query,
		{ symbol: 'EURUSD', timeframe: 'M5', count: 10 },
	);
	assert.deepEqual(
		buildRequest(
			op('subscription', 'delete'),
			reader({ subscriptionId: 's', closePositions: false }),
		).query,
		{ closePositions: 'false' },
	);
});

test('list and JSON fields become arrays and objects', () => {
	const wave = buildRequest(
		op('wave', 'create'),
		reader({
			accountIds: 'a1, a2,,a3',
			naming: 'symbol',
			marketName: 'EURUSD',
			side: 'sell',
			volume: '0.1',
			idempotencyKey: 'w1',
			additionalFields: { weights: '{"a1":"0.2"}', barrierPolicy: 'all-or-nothing' },
		}),
	);
	assert.deepEqual(wave.body, {
		accountIds: ['a1', 'a2', 'a3'],
		symbol: 'EURUSD',
		side: 'sell',
		volume: '0.1',
		weights: { a1: '0.2' },
		barrierPolicy: 'all-or-nothing',
	});
	assert.deepEqual(
		buildRequest(op('account', 'prepare'), reader({ accountIds: ['a1', 'a2'] })).body,
		{ accountIds: ['a1', 'a2'] },
	);
	assert.throws(
		() =>
			buildRequest(
				op('subscription', 'update'),
				reader({ subscriptionId: 's', updateFields: { settings: '{bad' } }),
			),
		/not valid JSON/,
	);
});

test('webhook create, update and replay send fields instead of a raw body', () => {
	assert.deepEqual(
		buildRequest(
			op('webhook', 'create'),
			reader({ url: 'https://example.com/h', additionalFields: { events: ['order.filled'] } }),
		).body,
		{ url: 'https://example.com/h', events: ['order.filled'] },
	);
	assert.deepEqual(
		buildRequest(
			op('webhook', 'update'),
			reader({ webhookId: 'w', updateFields: { description: 'alerts' } }),
		).body,
		{ description: 'alerts' },
	);
	assert.deepEqual(
		buildRequest(
			op('webhook', 'replay'),
			reader({
				webhookId: 'w',
				since: '2026-11-01T00:00:00.000001Z',
				additionalFields: { include: 'all' },
			}),
		).body,
		{ since: '2026-11-01T00:00:00.000001Z', include: 'all' },
	);
});

test('connect and password changes read the MT5 login from the credential, never a parameter', () => {
	const mt5 = { login: '51234567', server: 'Broker-Demo', password: 'secret' };
	assert.deepEqual(
		buildRequest(
			op('account', 'connect'),
			reader({ mode: 'warm_on_demand', additionalFields: {} }),
			mt5,
		).body,
		{ mode: 'warm_on_demand', ...mt5 },
	);
	assert.deepEqual(
		buildRequest(op('account', 'updatePassword'), reader({ accountId: 'a' }), mt5).body,
		{ password: 'secret', server: 'Broker-Demo' },
	);
	assert.throws(
		() => buildRequest(op('account', 'connect'), reader({ mode: 'cold', additionalFields: {} })),
		/MT5 Login credential/,
	);
});

test('calculate sends kind under its API name', () => {
	const request = buildRequest(
		op('account', 'calculate'),
		reader({
			accountId: 'a',
			calculation: 'profit',
			symbol: 'EURUSD',
			side: 'buy',
			volume: '1',
			price: '1.1',
			additionalFields: { closePrice: '1.2' },
		}),
	);
	assert.deepEqual(request.body, {
		kind: 'profit',
		symbol: 'EURUSD',
		side: 'buy',
		volume: '1',
		price: '1.1',
		closePrice: '1.2',
	});
});

test('an empty path parameter is refused', () => {
	assert.throws(
		() => buildRequest(op('order', 'get'), reader({ orderId: '' })),
		/'Order' is empty/,
	);
});

test('bodiless writes and reads send no body', () => {
	assert.equal(buildRequest(op('account', 'warm'), reader({ accountId: 'a' })).body, undefined);
	assert.equal(buildRequest(op('account', 'get'), reader({ accountId: 'a' })).body, undefined);
});

test('closing a multi-account order sends its key, and accounts only when added', () => {
	const all = buildRequest(
		op('wave', 'close'),
		reader({ waveId: 'w 1', idempotencyKey: 'close:sig-1', additionalFields: {} }),
	);
	assert.equal(all.method, 'POST');
	assert.equal(all.path, '/v1/execution-waves/w%201/close');
	assert.equal(all.idempotencyKey, 'close:sig-1');
	assert.deepEqual(all.body, {});
	assert.deepEqual(
		buildRequest(
			op('wave', 'close'),
			reader({ waveId: 'w', idempotencyKey: 'k', additionalFields: { accountIds: 'a1, a2' } }),
		).body,
		{ accountIds: ['a1', 'a2'] },
	);
	assert.throws(
		() => buildRequest(op('wave', 'close'), reader({ waveId: 'w', additionalFields: {} })),
		/Idempotency Key/,
	);
});

test('retrying a multi-account order sends the results to retry and the new timing', () => {
	const request = buildRequest(
		op('wave', 'retry'),
		reader({
			waveId: 'w1',
			idempotencyKey: 'retry:sig-1',
			additionalFields: {
				include: ['skipped', 'rejected'],
				accountIds: 'a1',
				barrierPolicy: 'wait',
				expiresAt: '2026-11-02T14:35:00Z',
			},
		}),
	);
	assert.equal(request.path, '/v1/execution-waves/w1/retry');
	assert.equal(request.idempotencyKey, 'retry:sig-1');
	assert.deepEqual(request.body, {
		include: ['skipped', 'rejected'],
		accountIds: ['a1'],
		barrierPolicy: 'wait',
		expiresAt: '2026-11-02T14:35:00Z',
	});
	assert.deepEqual(
		buildRequest(
			op('wave', 'retry'),
			reader({ waveId: 'w1', idempotencyKey: 'k', additionalFields: {} }),
		).body,
		{},
	);
	assert.throws(
		() => buildRequest(op('wave', 'retry'), reader({ waveId: '', idempotencyKey: 'k' })),
		/'Multi-Account Order' is empty/,
	);
});
