/** Collects the records of a list read. Does not depend on n8n, so it can be tested on its own. */
type Row = Record<string, unknown>;
type Page = { data?: unknown; page?: { hasMore?: boolean; nextCursor?: string | null } };
export type ListShape = { cursor?: boolean; max?: number; after?: string };

/** Without Return All, stops once `limit` records are in hand. With it, follows the API until the last page. */
export async function collect(
	fetchPage: (query: Record<string, unknown>) => Promise<Page>,
	baseQuery: Record<string, unknown>,
	list: ListShape,
	returnAll: boolean,
	limit: number,
): Promise<Row[]> {
	const wanted = returnAll ? Infinity : Math.max(1, Math.floor(limit));
	const out: Row[] = [];
	const query: Record<string, unknown> = { ...baseQuery };
	const afterMode =
		!!list.after && typeof query[list.after] === 'string' && query[list.after] !== '';
	for (let pages = 0; pages < 10_000; pages++) {
		if (list.max) query.limit = Math.min(list.max, wanted - out.length);
		const page = await fetchPage({ ...query });
		const rows = Array.isArray(page.data) ? (page.data as Row[]) : [];
		out.push(...rows);
		if (out.length >= wanted || !list.cursor || !rows.length) break;
		if (afterMode) {
			const last = rows[rows.length - 1]?.id;
			if (typeof last !== 'string') break;
			query[list.after as string] = last;
			continue;
		}
		const next = page.page?.hasMore ? page.page.nextCursor : null;
		if (!next) break;
		query.cursor = next;
	}
	return out.slice(0, wanted);
}
