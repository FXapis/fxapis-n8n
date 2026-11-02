/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collect } from '../nodes/Fxapis/lib/paginate.ts';

function pages(total: number, size = 3) {
	const rows = Array.from({ length: total }, (_, index) => ({ id: `r${index + 1}` }));
	const seen: Array<Record<string, unknown>> = [];
	const fetchPage = async (query: Record<string, unknown>) => {
		seen.push(query);
		const start = query.cursor ? Number(query.cursor) : 0;
		const take = Math.min(size, Number(query.limit ?? size));
		const data = rows.slice(start, start + take);
		const next = start + take;
		return {
			data,
			page: { hasMore: next < total, nextCursor: next < total ? String(next) : null },
		};
	};
	return { fetchPage, seen };
}

test('Return All follows the cursor to the last page', async () => {
	const { fetchPage, seen } = pages(7);
	const rows = await collect(fetchPage, { state: 'unknown' }, { cursor: true, max: 3 }, true, 0);
	assert.deepEqual(
		rows.map((row) => row.id),
		['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
	);
	assert.deepEqual(
		seen.map((query) => query.cursor),
		[undefined, '3', '6'],
	);
	assert.ok(seen.every((query) => query.state === 'unknown' && query.limit === 3));
});

test('Limit stops early and asks only for what is still needed', async () => {
	const { fetchPage, seen } = pages(10);
	const rows = await collect(fetchPage, {}, { cursor: true, max: 3 }, false, 5);
	assert.deepEqual(
		rows.map((row) => row.id),
		['r1', 'r2', 'r3', 'r4', 'r5'],
	);
	assert.deepEqual(
		seen.map((query) => query.limit),
		[3, 2],
	);
});

test('Limit under the page size is one request', async () => {
	const { fetchPage, seen } = pages(10, 50);
	const rows = await collect(fetchPage, {}, { cursor: true, max: 200 }, false, 4);
	assert.equal(rows.length, 4);
	assert.equal(seen.length, 1);
	assert.equal(seen[0].limit, 4);
});

test('a list without paging is cut to the limit', async () => {
	const fetchPage = async () => ({ data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
	assert.equal((await collect(fetchPage, {}, {}, false, 2)).length, 2);
	assert.equal((await collect(fetchPage, {}, {}, true, 0)).length, 3);
});

test('an empty list returns no records', async () => {
	assert.deepEqual(
		await collect(
			async () => ({ data: [], page: { hasMore: false, nextCursor: null } }),
			{},
			{ cursor: true, max: 200 },
			true,
			0,
		),
		[],
	);
});

test('with After, pages continue from the last event until a page is empty', async () => {
	const events = ['e1', 'e2', 'e3', 'e4', 'e5'];
	const seen: unknown[] = [];
	const fetchPage = async (query: Record<string, unknown>) => {
		seen.push(query.after);
		const start = events.indexOf(String(query.after)) + 1;
		return {
			data: events.slice(start, start + 2).map((id) => ({ id })),
			page: { hasMore: false, nextCursor: null },
		};
	};
	const rows = await collect(
		fetchPage,
		{ after: 'e1' },
		{ cursor: true, max: 2, after: 'after' },
		true,
		0,
	);
	assert.deepEqual(
		rows.map((row) => row.id),
		['e2', 'e3', 'e4', 'e5'],
	);
	assert.deepEqual(seen, ['e1', 'e3', 'e5']);
});
