/** fxapis error handling that does not depend on n8n, so it can be tested on its own. */

export type FxapisFailure = {
	status: number;
	code: string;
	message: string;
	requestId?: string;
	retryable: boolean;
	retryAfter?: number;
};

const NEVER_RETRY = new Set(['ORDER_UNRESOLVED', 'INVALID_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'FEATURE_NOT_IN_PLAN']);
const SAFE_TO_RETRY = new Set(['SEND_FAILED', 'ACCOUNT_NOT_READY', 'NO_RUNTIME', 'NO_PRICE', 'RATE_LIMITED', 'GATEWAY_ERROR', 'PLATFORM_ISSUE']);

export function redact(value: string): string {
	return value
		.replace(/fx_(?:live|test|admin)_[A-Za-z0-9_-]+/g, '[redacted key]')
		.replace(/whsec_[A-Za-z0-9_-]+/g, '[redacted secret]')
		.replace(/("password"\s*:\s*")[^"]*(")/gi, '$1[redacted]$2');
}

export function failureFrom(status: number, body: unknown, retryAfterHeader?: string): FxapisFailure {
	const record = isRecord(body) ? body : {};
	const error = isRecord(record.error) ? record.error : {};
	const code = typeof error.code === 'string' ? error.code : status >= 500 ? 'GATEWAY_ERROR' : 'REQUEST_FAILED';
	const message = redact(typeof error.message === 'string' ? error.message : `The API answered ${status}.`);
	const requestId = typeof record.requestId === 'string' ? record.requestId : undefined;
	const detailRetryable = firstRetryable(error.details);
	const retryAfter = retryAfterSeconds(retryAfterHeader);
	return {
		status,
		code,
		message,
		...(requestId ? { requestId } : {}),
		retryable: retryable(code, status, detailRetryable),
		...(retryAfter !== undefined ? { retryAfter } : {}),
	};
}

export function failureText(failure: FxapisFailure): string {
	const parts = [`${failure.code}: ${failure.message}`];
	if (failure.requestId) parts.push(`requestId ${failure.requestId}`);
	if (failure.code === 'ORDER_UNRESOLVED') parts.push('Do not resend this order. Poll the order until it leaves unknown.');
	else if (failure.retryable) parts.push('Nothing new was opened. Retry with the same idempotency key.');
	else if (failure.code === 'ORDER_REJECTED') parts.push('The broker refused it. A retry needs a new idempotency key, and only if the reason was transient.');
	return parts.join(' ');
}

function retryable(code: string, status: number, detail: boolean | undefined): boolean {
	if (NEVER_RETRY.has(code)) return false;
	if (detail !== undefined) return detail;
	if (SAFE_TO_RETRY.has(code) || status === 429 || status === 503) return true;
	return false;
}

function firstRetryable(details: unknown): boolean | undefined {
	if (!Array.isArray(details)) return undefined;
	const first = details.find(isRecord);
	return typeof first?.retryable === 'boolean' ? first.retryable : undefined;
}

function retryAfterSeconds(header: string | undefined): number | undefined {
	if (!header) return undefined;
	const seconds = Number(header);
	return Number.isFinite(seconds) ? seconds : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
