/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import test from 'node:test';
import { OPERATIONS, operationFor } from '../nodes/Fxapis/catalog.ts';
import { SUBSCRIBABLE_EVENTS } from '../nodes/FxapisTrigger/events.ts';
import { Fxapis } from '../nodes/Fxapis/Fxapis.node.ts';

test('every path parameter is collected as a parameter, and nothing else is', () => {
	for (const operation of OPERATIONS) {
		const inPath = [...operation.path.matchAll(/:([A-Za-z]+)/g)].map((match) => match[1]);
		assert.deepEqual(
			(operation.params ?? []).map((field) => field.name),
			inPath,
			`${operation.resource}.${operation.operation}`,
		);
	}
});

test('every operation is unique and on a public /v1 path', () => {
	const keys = new Set<string>();
	for (const operation of OPERATIONS) {
		const key = `${operation.resource}.${operation.operation}`;
		assert.equal(keys.has(key), false, key);
		keys.add(key);
		assert.match(operation.path, /^\/v1\//);
		assert.doesNotMatch(operation.path, /api-keys|members|alert-hooks/);
	}
});

test('the catalog covers the documented customer endpoints', () => {
	const keys = new Set(
		OPERATIONS.map((item) => `${item.method} ${item.path.replace(/:[A-Za-z]+/g, '{}')}`),
	);
	for (const endpoint of [
		'GET /v1/accounts',
		'POST /v1/accounts',
		'GET /v1/accounts/{}',
		'DELETE /v1/accounts/{}',
		'GET /v1/accounts/{}/status',
		'GET /v1/accounts/{}/figures',
		'POST /v1/accounts/{}/password',
		'POST /v1/accounts/{}/server',
		'GET /v1/accounts/{}/events',
		'GET /v1/accounts/{}/quotes',
		'GET /v1/accounts/{}/candles',
		'POST /v1/accounts/{}/warm',
		'POST /v1/accounts/prepare',
		'POST /v1/accounts/{}/cool',
		'POST /v1/accounts/{}/restart',
		'POST /v1/accounts/{}/disconnect',
		'POST /v1/accounts/{}/mode',
		'GET /v1/instruments',
		'GET /v1/accounts/{}/symbols',
		'GET /v1/accounts/{}/instruments',
		'GET /v1/accounts/{}/sessions',
		'POST /v1/accounts/{}/symbols/sync',
		'GET /v1/brokers/servers',
		'POST /v1/accounts/{}/orders/market',
		'POST /v1/accounts/{}/positions/{}/close',
		'POST /v1/accounts/{}/positions/{}/modify',
		'POST /v1/accounts/{}/orders/pending',
		'POST /v1/orders/{}/modify',
		'POST /v1/orders/{}/cancel',
		'POST /v1/accounts/{}/calculate',
		'GET /v1/orders',
		'GET /v1/orders/{}',
		'GET /v1/orders/{}/deals',
		'GET /v1/accounts/{}/deals',
		'POST /v1/accounts/{}/reconcile',
		'GET /v1/accounts/{}/positions',
		'POST /v1/execution-waves',
		'GET /v1/execution-waves',
		'GET /v1/execution-waves/{}',
		'POST /v1/execution-waves/{}/cancel',
		'POST /v1/execution-waves/{}/close',
		'POST /v1/execution-waves/{}/retry',
		'GET /v1/copy/status',
		'GET /v1/copy/strategies',
		'POST /v1/copy/strategies',
		'GET /v1/copy/strategies/{}',
		'PATCH /v1/copy/strategies/{}',
		'DELETE /v1/copy/strategies/{}',
		'GET /v1/copy/subscriptions',
		'POST /v1/copy/subscriptions',
		'GET /v1/copy/subscriptions/{}',
		'PATCH /v1/copy/subscriptions/{}',
		'DELETE /v1/copy/subscriptions/{}',
		'POST /v1/copy/subscriptions/{}/reset',
		'GET /v1/copy/subscriptions/{}/links',
		'GET /v1/copy/executions',
		'GET /v1/plans',
		'GET /v1/billing/usage',
		'GET /v1/billing/usage/daily',
		'GET /v1/billing/subscription',
		'GET /v1/billing/invoices',
		'GET /v1/billing/crypto/coins',
		'GET /v1/billing/invoices/{}',
		'GET /v1/workspace',
		'GET /v1/webhooks',
		'POST /v1/webhooks',
		'GET /v1/webhooks/{}',
		'PATCH /v1/webhooks/{}',
		'DELETE /v1/webhooks/{}',
		'POST /v1/webhooks/{}/enable',
		'POST /v1/webhooks/{}/disable',
		'POST /v1/webhooks/{}/rotate',
		'POST /v1/webhooks/{}/test',
		'GET /v1/webhooks/{}/deliveries',
		'GET /v1/webhooks/{}/deliveries/{}',
		'POST /v1/webhooks/{}/deliveries/{}/redeliver',
		'POST /v1/webhooks/{}/replay',
		'GET /v1/events',
		'GET /v1/events/{}',
	]) {
		assert.equal(keys.has(endpoint), true, endpoint);
	}
});

test('only order writes that open or close exposure ask for an idempotency key', () => {
	const idempotent = OPERATIONS.filter((item) => item.idempotent).map(
		(item) => `${item.resource}.${item.operation}`,
	);
	assert.deepEqual(idempotent.sort(), [
		'order.market',
		'order.pending',
		'position.close',
		'wave.close',
		'wave.create',
		'wave.retry',
	]);
});

test('list operations are named Get Many or Search and have Return All and Limit', () => {
	const properties = new Fxapis().description.properties;
	for (const operation of OPERATIONS.filter((item) => item.list)) {
		assert.match(
			operation.operationName,
			/^(Get Many|Search|Get Activity)/,
			`${operation.resource}.${operation.operation}`,
		);
		const shown = (name: string) =>
			properties.find(
				(item) =>
					item.name === name &&
					item.displayOptions?.show?.resource?.includes(operation.resource) &&
					item.displayOptions?.show?.operation?.includes(operation.operation),
			);
		assert.ok(shown('returnAll'), `${operation.resource}.${operation.operation} returnAll`);
		const limit = shown('limit');
		assert.equal(limit?.typeOptions?.minValue, 1);
		assert.deepEqual(limit?.displayOptions?.show?.returnAll, [false]);
	}
});

test('no node parameter holds a password', () => {
	const json = JSON.stringify(new Fxapis().description.properties);
	assert.doesNotMatch(json, /"name":"password"/);
});

test('top-level parameters that share a name share a type', () => {
	const types = new Map<string, string>();
	for (const property of new Fxapis().description.properties) {
		const seen = types.get(property.name);
		if (seen) assert.equal(property.type, seen, property.name);
		else types.set(property.name, property.type);
	}
});

test('optional fields live in a collection and are sorted', () => {
	for (const property of new Fxapis().description.properties.filter(
		(item) => item.type === 'collection',
	)) {
		const names = (property.options ?? []).map((option) =>
			'displayName' in option ? option.displayName : '',
		);
		assert.deepEqual(
			names,
			[...names].sort((a, b) => a.localeCompare(b)),
			property.name,
		);
		assert.deepEqual(property.default, {});
	}
});

test('the webhook events the node manages are the ones the trigger offers, wave.updated included', () => {
	const events = operationFor('webhook', 'create')?.body?.find((field) => field.name === 'events');
	const values = (events?.options ?? []).map((option) => option.value);
	assert.deepEqual(values, [...SUBSCRIBABLE_EVENTS]);
	assert.ok(values.includes('wave.updated'));
});

test('multi-account order close and retry are offered, after cancel, on the order picked from a list', () => {
	const waves = OPERATIONS.filter((item) => item.resource === 'wave').map((item) => item.operation);
	assert.deepEqual(waves, ['create', 'list', 'get', 'cancel', 'close', 'retry']);
	for (const name of ['close', 'retry']) {
		const operation = operationFor('wave', name);
		assert.equal(operation?.params?.[0]?.locator, 'wave', name);
		assert.equal(
			operation?.body?.some((field) => field.required),
			false,
			`${name} has only optional body fields`,
		);
	}
});
