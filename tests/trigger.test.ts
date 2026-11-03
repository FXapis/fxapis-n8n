/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import test from 'node:test';
import { FxapisTrigger } from '../nodes/FxapisTrigger/FxapisTrigger.node.ts';
import { fakeContext, path, type Call, type Reply } from './fake.ts';

const hooks = new FxapisTrigger().webhookMethods.default as unknown as Record<
	'checkExists' | 'create' | 'delete',
	(this: unknown) => Promise<boolean>
>;
const URL_HERE = 'https://n8n.example.com/webhook/abc/fxapis';

function endpoint(overrides: Record<string, unknown> = {}) {
	return {
		id: 'wh_1',
		url: URL_HERE,
		events: ['order.filled', 'position.closed'],
		enabled: true,
		...overrides,
	};
}

function context(options: {
	events?: string[];
	stored?: boolean;
	get?: Reply;
	del?: Reply;
	wrapErrors?: boolean;
}) {
	return fakeContext({
		wrapErrors: options.wrapErrors,
		params: { events: options.events ?? ['position.closed', 'order.filled'] },
		staticData: options.stored === false ? {} : { endpointId: 'wh_1', secret: 'whsec_1' },
		webhookUrl: URL_HERE,
		route: (call: Call) => {
			if (call.method === 'GET') return options.get ?? { body: { data: endpoint() } };
			if (call.method === 'DELETE') return options.del ?? { body: { data: endpoint() } };
			return { status: 201, body: { data: { ...endpoint(), id: 'wh_2', secret: 'whsec_2' } } };
		},
	});
}

const notFound: Reply = {
	status: 404,
	body: { error: { code: 'NOT_FOUND', message: 'No such webhook.' }, requestId: 'r' },
};

test('checkExists is true when the endpoint is enabled, at this URL, with these events', async () => {
	const ctx = context({});
	assert.equal(await hooks.checkExists.call(ctx), true);
	assert.deepEqual(
		ctx.calls.map((call) => `${call.method} ${path(call)}`),
		['GET /v1/webhooks/wh_1'],
	);
	assert.equal(ctx.staticData.endpointId, 'wh_1');
});

test('checkExists is false without a stored endpoint, and asks nothing', async () => {
	const ctx = context({ stored: false });
	assert.equal(await hooks.checkExists.call(ctx), false);
	assert.equal(ctx.calls.length, 0);
});

test('a deleted endpoint is forgotten so n8n creates a new one', async () => {
	const ctx = context({ get: notFound });
	assert.equal(await hooks.checkExists.call(ctx), false);
	assert.equal(ctx.staticData.endpointId, undefined);
	assert.equal(ctx.staticData.secret, undefined);
	assert.deepEqual(
		ctx.calls.map((call) => call.method),
		['GET'],
	);
});

for (const [name, stale] of [
	['disabled', endpoint({ enabled: false })],
	['at another URL', endpoint({ url: 'https://old.example.com/webhook/abc/fxapis' })],
	['with other events', endpoint({ events: ['order.filled'] })],
	['receiving every event', endpoint({ events: [] })],
] as const) {
	test(`an endpoint ${name} is deleted and recreated`, async () => {
		const ctx = context({ get: { body: { data: stale } } });
		assert.equal(await hooks.checkExists.call(ctx), false);
		assert.deepEqual(
			ctx.calls.map((call) => `${call.method} ${path(call)}`),
			['GET /v1/webhooks/wh_1', 'DELETE /v1/webhooks/wh_1'],
		);
		assert.equal(ctx.staticData.endpointId, undefined);
	});
}

test('a stale endpoint that is already gone is still forgotten', async () => {
	const ctx = context({ get: { body: { data: endpoint({ enabled: false }) } }, del: notFound });
	assert.equal(await hooks.checkExists.call(ctx), false);
	assert.equal(ctx.staticData.endpointId, undefined);
});

test('no events configured matches an endpoint that receives every event', async () => {
	const ctx = context({ events: [], get: { body: { data: endpoint({ events: [] }) } } });
	assert.equal(await hooks.checkExists.call(ctx), true);
});

test('checkExists passes on errors other than 404', async () => {
	const ctx = context({
		get: { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'bad key' } } },
	});
	await assert.rejects(hooks.checkExists.call(ctx), /UNAUTHENTICATED/);
	assert.equal(ctx.staticData.endpointId, 'wh_1');
});

test('create registers this URL with the events and keeps the secret', async () => {
	const ctx = context({ stored: false });
	assert.equal(await hooks.create.call(ctx), true);
	assert.deepEqual(ctx.calls[0].body, {
		url: URL_HERE,
		events: ['position.closed', 'order.filled'],
		description: 'n8n fxapis trigger',
	});
	assert.equal(ctx.staticData.endpointId, 'wh_2');
	assert.equal(ctx.staticData.secret, 'whsec_2');
});

test('delete treats 404 as done', async () => {
	const ctx = context({ del: notFound });
	assert.equal(await hooks.delete.call(ctx), true);
	assert.equal(ctx.staticData.endpointId, undefined);
	assert.equal(ctx.staticData.secret, undefined);
});

test('delete fails on other errors and keeps the endpoint to try again', async () => {
	const ctx = context({
		del: { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'x' } } },
	});
	await assert.rejects(hooks.delete.call(ctx), /INTERNAL_ERROR/);
	assert.equal(ctx.staticData.endpointId, 'wh_1');
});

test('a 404 is recognised when n8n wraps the HTTP error in its own error', async () => {
	const ctx = context({ get: notFound, wrapErrors: true });
	assert.equal(await hooks.checkExists.call(ctx), false);
	const gone = context({ del: notFound, wrapErrors: true });
	assert.equal(await hooks.delete.call(gone), true);
});

test('the trigger offers wave.updated and subscribes to it when chosen', async () => {
	const events = new FxapisTrigger().description.properties.find((item) => item.name === 'events');
	const values = (events?.options ?? []).map((option) => ('value' in option ? option.value : ''));
	assert.ok(values.includes('wave.settled'));
	assert.ok(values.includes('wave.updated'));
	const ctx = context({ stored: false, events: ['wave.settled', 'wave.updated'] });
	assert.equal(await hooks.create.call(ctx), true);
	assert.deepEqual((ctx.calls[0].body as { events: string[] }).events, [
		'wave.settled',
		'wave.updated',
	]);
});
