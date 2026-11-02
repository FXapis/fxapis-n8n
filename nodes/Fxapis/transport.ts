import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { failureFrom, failureParts, redact, type FxapisFailure } from './lib/errors';
import { ParameterError } from './lib/request';
import { assertApiBase } from './lib/url';

type Caller = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions;

export type FxapisRequest = {
	method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	path: string;
	body?: IDataObject;
	query?: IDataObject;
	idempotencyKey?: string;
	itemIndex?: number;
};

/** Returns the whole answer: `{ data }`, plus `page` on a paged list. */
export async function fxapisRequest(this: Caller, options: FxapisRequest): Promise<IDataObject> {
	let base: string;
	try {
		base = assertApiBase(await credentialBase(this));
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			error instanceof Error ? error.message : 'API base URL was refused.',
			{
				itemIndex: options.itemIndex ?? 0,
				description:
					"Change 'API Base URL' in the fxapis credential, or leave it as https://api.fxapis.com.",
			},
		);
	}
	const request: IHttpRequestOptions = {
		method: options.method,
		url: `${base}${options.path}`,
		qs: options.query,
		json: true,
		headers: options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {},
		// n8n wraps a failed status in its own error and drops the headers, retry-after included.
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (options.body && options.method !== 'GET') request.body = options.body;
	let response: unknown;
	try {
		response = await this.helpers.httpRequestWithAuthentication.call(this, 'fxapisApi', request);
	} catch (error) {
		throw apiError(this, httpAnswer(error), error, options.itemIndex ?? 0);
	}
	const full = isRecord(response) ? response : {};
	const status = numeric(full.statusCode);
	if (status !== undefined && status >= 400) {
		const headers = isRecord(full.headers) ? full.headers : {};
		const retryAfter = headers['retry-after'];
		throw apiError(
			this,
			{
				status,
				body: errorBody(full.body) ?? full.body,
				retryAfter: retryAfter === undefined ? undefined : String(retryAfter),
			},
			undefined,
			options.itemIndex ?? 0,
		);
	}
	const body = status === undefined ? response : full.body;
	return isRecord(body) ? (body as IDataObject) : {};
}

export async function credentialBase(caller: Caller): Promise<string | undefined> {
	const credentials = await caller.getCredentials('fxapisApi');
	return typeof credentials.baseUrl === 'string' ? credentials.baseUrl : undefined;
}

/** The fxapis failure behind an error this module threw, if there is one. */
export function failureOf(error: unknown): FxapisFailure | undefined {
	if (!(error instanceof NodeApiError)) return undefined;
	const failure = (error.context as IDataObject | undefined)?.fxapis;
	return isRecord(failure) ? (failure as unknown as FxapisFailure) : undefined;
}

/** An n8n error for anything thrown while running an item. fxapis and parameter errors pass through with their text. */
export function asNodeError(
	caller: Caller,
	error: unknown,
	itemIndex = 0,
): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) return error;
	if (error instanceof ParameterError)
		return new NodeOperationError(caller.getNode(), error.message, {
			itemIndex,
			description: error.description,
		});
	return new NodeOperationError(
		caller.getNode(),
		error instanceof Error ? error : new Error('Request failed'),
		{ itemIndex },
	);
}

export function isNotFound(error: unknown): boolean {
	return (
		failureOf(error)?.status === 404 || (error instanceof NodeApiError && error.httpCode === '404')
	);
}

/** A NodeApiError built from another one returns that one unchanged, so the new error is built from a plain object. */
type Answer = { status?: number; body?: unknown; retryAfter?: string };

function apiError(caller: Caller, answer: Answer, error: unknown, itemIndex: number): Error {
	if (answer.status === undefined) {
		return new NodeOperationError(caller.getNode(), 'The fxapis API could not be reached', {
			itemIndex,
			description: redact(
				error instanceof Error
					? error.message
					: 'No answer came back. Check the network and the status page.',
			),
		});
	}
	const failure = failureFrom(answer.status, answer.body, answer.retryAfter);
	const { message, description } = failureParts(failure);
	const wrapped = new NodeApiError(caller.getNode(), { ...failure } as unknown as JsonObject, {
		message: redact(message),
		description: description || undefined,
		httpCode: String(answer.status),
		itemIndex,
	});
	wrapped.context.fxapis = { ...failure };
	return wrapped;
}

/** Reads the status and body from a thrown error, however n8n wrapped it. */
function httpAnswer(error: unknown): Answer {
	const seen = new Set<unknown>();
	let status: number | undefined;
	let body: unknown;
	let retryAfter: string | undefined;
	const queue: unknown[] = [error];
	while (queue.length) {
		const item = queue.shift();
		if (!isRecord(item) || seen.has(item)) continue;
		seen.add(item);
		const response = isRecord(item.response) ? item.response : undefined;
		status ??=
			numeric(response?.status) ??
			numeric(response?.statusCode) ??
			numeric(item.statusCode) ??
			numeric(item.httpCode);
		body ??=
			errorBody(response?.data) ??
			errorBody(response?.body) ??
			errorBody(item.error) ??
			errorBody(isRecord(item.context) ? item.context.data : undefined);
		const headers = isRecord(response?.headers)
			? response.headers
			: isRecord(item.headers)
				? item.headers
				: undefined;
		const header = headers?.['retry-after'];
		if (retryAfter === undefined && (typeof header === 'string' || typeof header === 'number'))
			retryAfter = String(header);
		queue.push(item.cause, item.reason, item.errorResponse);
	}
	return { status, body, retryAfter };
}

function errorBody(value: unknown): unknown {
	if (typeof value === 'string') {
		try {
			value = JSON.parse(value);
		} catch {
			return undefined;
		}
	}
	return isRecord(value) && isRecord(value.error) ? value : undefined;
}

function numeric(value: unknown): number | undefined {
	const number = typeof value === 'string' ? Number(value) : value;
	return typeof number === 'number' && Number.isInteger(number) && number >= 100 && number < 600
		? number
		: undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
