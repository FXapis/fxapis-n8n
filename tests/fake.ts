/** A small stand-in for the n8n function contexts the nodes use. */
import { NodeApiError, type JsonObject } from 'n8n-workflow';

export type Call = {
	method: string;
	url: string;
	qs?: Record<string, unknown>;
	body?: unknown;
	headers?: Record<string, string>;
};
export type Reply = { status?: number; body: unknown; headers?: Record<string, string> };
export type Route = (call: Call) => Reply;

export function fakeContext(options: {
	params?: Record<string, unknown> | Array<Record<string, unknown>>;
	route: Route;
	staticData?: Record<string, unknown>;
	webhookUrl?: string;
	continueOnFail?: boolean;
	credentials?: Record<string, Record<string, unknown>>;
	/** Ignore returnFullResponse and ignoreHttpStatusErrors, and throw the way n8n does without them: its own NodeApiError around the HTTP error. */
	wrapErrors?: boolean;
}) {
	const calls: Call[] = [];
	const staticData = options.staticData ?? {};
	const itemParams = Array.isArray(options.params) ? options.params : [options.params ?? {}];
	const credentials = {
		fxapisApi: { apiKey: 'fx_test_x', baseUrl: 'https://api.fxapis.com' },
		...options.credentials,
	};
	const node = {
		id: 'n1',
		name: 'fxapis',
		type: 'n8n-nodes-fxapis.fxapis',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const context = {
		calls,
		staticData,
		getNode: () => node,
		getInputData: () => itemParams.map(() => ({ json: {} })),
		continueOnFail: () => options.continueOnFail === true,
		getNodeParameter(name: string, itemIndexOrFallback?: unknown, fallback?: unknown) {
			const index = typeof itemIndexOrFallback === 'number' ? itemIndexOrFallback : 0;
			const fallbackValue =
				typeof itemIndexOrFallback === 'number' ? fallback : itemIndexOrFallback;
			const params = itemParams[index] ?? {};
			if (name in params) return params[name];
			if (fallbackValue !== undefined) return fallbackValue;
			throw new Error(`Could not get parameter "${name}"`);
		},
		getCredentials: async (name: string) => {
			const found = credentials[name as keyof typeof credentials];
			if (!found) throw new Error(`Node does not have any credentials set for "${name}"`);
			return found;
		},
		getWorkflowStaticData: () => staticData,
		getNodeWebhookUrl: () => options.webhookUrl ?? 'https://n8n.example.com/webhook/abc/fxapis',
		helpers: {
			async httpRequestWithAuthentication(
				_credential: string,
				request: Call & { returnFullResponse?: boolean; ignoreHttpStatusErrors?: boolean },
			) {
				const call: Call = {
					method: request.method,
					url: request.url,
					qs: request.qs,
					body: request.body,
					headers: request.headers,
				};
				calls.push(call);
				const reply = options.route(call);
				const status = reply.status ?? 200;
				if (request.returnFullResponse && request.ignoreHttpStatusErrors && !options.wrapErrors) {
					return {
						statusCode: status,
						statusMessage: '',
						headers: reply.headers ?? {},
						body: reply.body,
					};
				}
				if (status >= 400) {
					const error = new Error(`Request failed with status code ${status}`) as Error & {
						response: unknown;
					};
					error.response = { status, data: reply.body, headers: reply.headers ?? {} };
					if (options.wrapErrors)
						throw new NodeApiError(node as never, error as unknown as JsonObject);
					throw error;
				}
				if (request.returnFullResponse)
					return {
						statusCode: status,
						statusMessage: '',
						headers: reply.headers ?? {},
						body: reply.body,
					};
				return reply.body;
			},
		},
	};
	return context;
}

export function path(call: Call): string {
	return new URL(call.url).pathname;
}
