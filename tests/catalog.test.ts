/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import test from 'node:test';
import { OPERATIONS } from '../nodes/Fxapis/catalog.ts';

test('every path parameter is collected as a field', () => {
	for (const operation of OPERATIONS) {
		const names = new Set((operation.body ?? []).map((field) => field.name));
		for (const match of operation.path.matchAll(/:([A-Za-z]+)/g)) {
			assert.equal(names.has(match[1]), true, `${operation.resource}.${operation.operation} missing ${match[1]}`);
		}
	}
});

test('the added operations stay on the public paths', () => {
	const keys = new Set(OPERATIONS.map((item) => `${item.method} ${item.path}`));
	for (const path of [
		'GET /v1/orders',
		'POST /v1/accounts/prepare',
		'DELETE /v1/accounts/:accountId',
		'GET /v1/webhooks',
		'POST /v1/webhooks',
		'PATCH /v1/webhooks/:webhookId',
		'POST /v1/webhooks/:webhookId/rotate',
		'POST /v1/webhooks/:webhookId/replay',
		'GET /v1/copy/status',
		'POST /v1/copy/strategies',
		'DELETE /v1/copy/subscriptions/:subscriptionId',
		'GET /v1/copy/executions',
		'GET /v1/billing/usage',
		'GET /v1/billing/invoices/:invoiceId',
		'GET /v1/billing/crypto/coins',
	]) {
		assert.equal(keys.has(path), true, path);
	}
});
