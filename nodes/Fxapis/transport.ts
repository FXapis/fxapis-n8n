import { NodeApiError, NodeOperationError, type IDataObject, type IExecuteFunctions, type IHookFunctions, type IHttpRequestOptions } from 'n8n-workflow';
import { failureFrom, failureText, redact } from './lib/errors';
import { assertApiBase } from './lib/url';

type Caller = IExecuteFunctions | IHookFunctions;

export async function fxapisRequest(this: Caller, options: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; body?: IDataObject; query?: IDataObject; idempotencyKey?: string; itemIndex?: number }): Promise<IDataObject> {
	let base: string;
	try {
		base = assertApiBase(await credentialBase(this));
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error instanceof Error ? error.message : 'API base URL was refused.', { itemIndex: options.itemIndex ?? 0 });
	}
	const request: IHttpRequestOptions = {
		method: options.method,
		url: `${base}${options.path}`,
		qs: options.query,
		json: true,
		headers: options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {},
	};
	if (options.body && options.method !== 'GET') request.body = options.body;
	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'fxapisApi', request);
		if (response && typeof response === 'object' && 'data' in response) return response.data as IDataObject;
		return (response ?? {}) as IDataObject;
	} catch (error) {
		throw apiError(this, error, options.itemIndex ?? 0);
	}
}

export async function credentialBase(caller: Caller): Promise<string | undefined> {
	const credentials = await caller.getCredentials('fxapisApi');
	return typeof credentials.baseUrl === 'string' ? credentials.baseUrl : undefined;
}

function apiError(caller: Caller, error: unknown, itemIndex: number): Error {
	const http = isRecord(error) ? error : {};
	const status = typeof http.statusCode === 'number' ? http.statusCode : 500;
	const body = http.error ?? http.response ?? http;
	const header = isRecord(http.headers) ? String(http.headers['retry-after'] ?? '') : undefined;
	try {
		const failure = failureFrom(status, body, header);
		const wrapped = new NodeApiError(caller.getNode(), { message: redact(failureText(failure)), httpCode: String(status) });
		wrapped.description = failure.requestId ? `requestId ${failure.requestId}` : failure.code;
		return wrapped;
	} catch (invalid) {
		return new NodeOperationError(caller.getNode(), invalid instanceof Error ? invalid.message : 'The request could not be sent.', { itemIndex });
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object';
}
