import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import type { Locator } from './catalog';
import { fxapisRequest } from './transport';

type Search = (
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
) => Promise<INodeListSearchResult>;
type Source = {
	path: (caller: ILoadOptionsFunctions) => string | undefined;
	cursor?: boolean;
	item: (row: IDataObject) => INodeListSearchItems;
};

const text = (value: unknown) =>
	typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const join = (...parts: unknown[]) => parts.map(text).filter(Boolean).join(' · ');

const SOURCES: Record<Locator, Source> = {
	account: {
		path: () => '/v1/accounts',
		item: (row) => ({
			name: join(row.label || row.login, row.label ? row.login : '', row.server, row.state),
			value: text(row.id),
		}),
	},
	order: {
		path: () => '/v1/orders',
		cursor: true,
		item: (row) => ({
			name: join(
				`${text(row.side)} ${text(row.volume)} ${text(row.symbol)}`.trim(),
				row.type,
				row.state,
				row.createdAt,
			),
			value: text(row.id),
		}),
	},
	position: {
		path: (caller) => {
			const accountId = text(caller.getCurrentNodeParameter('accountId', { extractValue: true }));
			return accountId ? `/v1/accounts/${encodeURIComponent(accountId)}/positions` : undefined;
		},
		item: (row) => ({
			name: join(
				`${text(row.side)} ${text(row.volume)} ${text(row.symbol)}`.trim(),
				`#${text(row.brokerPositionId)}`,
				row.profit,
			),
			value: text(row.brokerPositionId),
		}),
	},
	wave: {
		path: () => '/v1/execution-waves',
		item: (row) => ({
			name: join(
				row.label || `${text(row.side)} ${text(row.symbol || row.instrument)}`,
				row.state,
				row.createdAt,
			),
			value: text(row.id),
		}),
	},
	webhook: {
		path: () => '/v1/webhooks',
		item: (row) => ({
			name: join(row.description || row.url, row.enabled === false ? 'disabled' : ''),
			value: text(row.id),
			url: text(row.url) || undefined,
		}),
	},
	strategy: {
		path: () => '/v1/copy/strategies',
		cursor: true,
		item: (row) => ({ name: join(row.name, row.status), value: text(row.id) }),
	},
	subscription: {
		path: () => '/v1/copy/subscriptions',
		cursor: true,
		item: (row) => {
			const follower = (row.follower ?? {}) as IDataObject;
			return {
				name: join(follower.label || follower.login || row.followerAccountId, row.status),
				value: text(row.id),
			};
		},
	},
	invoice: {
		path: () => '/v1/billing/invoices',
		item: (row) => ({ name: join(row.number, row.status, row.createdAt), value: text(row.id) }),
	},
};

function search(locator: Locator): Search {
	const source = SOURCES[locator];
	return async function (this: ILoadOptionsFunctions, filter?: string, paginationToken?: string) {
		const path = source.path(this);
		if (!path) return { results: [] };
		const query: IDataObject = source.cursor
			? { limit: 100, ...(paginationToken ? { cursor: paginationToken } : {}) }
			: {};
		const response = await fxapisRequest.call(this, { method: 'GET', path, query });
		const rows = Array.isArray(response.data) ? (response.data as IDataObject[]) : [];
		const needle = (filter ?? '').trim().toLowerCase();
		const results = rows
			.map(source.item)
			.filter(
				(item) =>
					item.value !== '' &&
					(!needle ||
						item.name.toLowerCase().includes(needle) ||
						String(item.value).toLowerCase().includes(needle)),
			);
		const page = (response.page ?? {}) as IDataObject;
		const next =
			source.cursor && page.hasMore === true && typeof page.nextCursor === 'string'
				? page.nextCursor
				: undefined;
		return { results, ...(next ? { paginationToken: next } : {}) };
	};
}

export const SEARCH_METHODS: Record<Locator, string> = {
	account: 'searchAccounts',
	order: 'searchOrders',
	position: 'searchPositions',
	wave: 'searchWaves',
	webhook: 'searchWebhooks',
	strategy: 'searchStrategies',
	subscription: 'searchSubscriptions',
	invoice: 'searchInvoices',
};

export const listSearch: Record<string, Search> = Object.fromEntries(
	(Object.keys(SEARCH_METHODS) as Locator[]).map((locator) => [
		SEARCH_METHODS[locator],
		search(locator),
	]),
);
