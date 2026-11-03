/** fxapis error handling that does not depend on n8n, so it can be tested on its own. */

export type FxapisFailure = {
	status: number;
	code: string;
	message: string;
	requestId?: string;
	retryable: boolean;
	retryAfter?: number;
};

/** Codes the API documents as never safe to send again as they are. */
const NEVER_RETRY = new Set([
	'ORDER_UNRESOLVED',
	'INVALID_REQUEST',
	'UNAUTHENTICATED',
	'MISSING_SCOPE',
	'KEY_LIMIT_EXCEEDED',
	'NOT_FOUND',
	'ACCOUNT_NOT_FOUND',
	'ORDER_NOT_FOUND',
	'POSITION_NOT_FOUND',
	'WAVE_NOT_FOUND',
	'WAVE_ALREADY_RELEASING',
	'NOTHING_TO_RETRY',
	'IDEMPOTENCY_KEY_REUSED',
	'TRADING_DISABLED',
	'FEATURE_NOT_IN_PLAN',
	'QUOTA_EXCEEDED',
]);
/** Codes the API documents as safe to send again, as they are, after a short wait. */
const SAFE_TO_RETRY = new Set([
	'SEND_FAILED',
	'ACCOUNT_NOT_READY',
	'NO_RUNTIME',
	'RATE_LIMITED',
	'IDEMPOTENCY_IN_FLIGHT',
	'ACCOUNT_EXECUTING',
	'ACCOUNT_LEASED_ELSEWHERE',
	'SECRET_STORE_UNAVAILABLE',
	'SCHEDULER_FAILED',
	'RESTART_FAILED',
	'MT5_UNAVAILABLE',
	'SYMBOLS_UNAVAILABLE',
	'SESSIONS_NOT_SYNCED',
	'WORKSPACE_BUSY',
	'PROVIDER_ERROR',
	'TOO_SOON',
	'INTERNAL_ERROR',
	'GATEWAY_ERROR',
]);

export function redact(value: string): string {
	return value
		.replace(/fx_(?:live|test|admin)_[A-Za-z0-9_-]+/g, '[redacted key]')
		.replace(/whsec_[A-Za-z0-9_-]+/g, '[redacted secret]')
		.replace(/("password"\s*:\s*")[^"]*(")/gi, '$1[redacted]$2');
}

export function failureFrom(
	status: number,
	body: unknown,
	retryAfterHeader?: string,
): FxapisFailure {
	const record = isRecord(body) ? body : {};
	const error = isRecord(record.error) ? record.error : {};
	const code =
		typeof error.code === 'string'
			? error.code
			: status >= 500
				? 'GATEWAY_ERROR'
				: 'REQUEST_FAILED';
	const message = redact(
		typeof error.message === 'string' ? error.message : `The API answered ${status}.`,
	);
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
	const { message, description } = failureParts(failure);
	return description ? `${message} ${description}` : message;
}

/** The message says what happened; the description says what to do, and carries the request ID for support. */
export function failureParts(failure: FxapisFailure): { message: string; description: string } {
	const hints: string[] = [];
	if (failure.code === 'ORDER_UNRESOLVED')
		hints.push('Do not resend this order. Poll the order until it leaves unknown.');
	else if (failure.retryable) {
		const wait =
			failure.retryAfter !== undefined
				? ` after ${failure.retryAfter} seconds`
				: ' after a short wait';
		hints.push(`Safe to send again as it is${wait}. For an order, reuse the same idempotency key.`);
	} else if (failure.code === 'ORDER_REJECTED')
		hints.push(
			'The broker refused it. A retry needs a new idempotency key, and only if the reason was transient.',
		);
	else if (failure.code === 'UNAUTHENTICATED')
		hints.push('Check the API key in the fxapis credential.');
	else if (failure.code === 'MISSING_SCOPE')
		hints.push('Use an API key with the scope this operation needs.');
	else if (failure.code === 'WAVE_NOT_ENDED')
		hints.push(
			'Wait until the multi-account order has ended (settled, cancelled or abandoned), then send it again with the same idempotency key.',
		);
	else if (failure.code === 'COPY_TRADING_PAUSED') hints.push('Copy trading is coming soon.');
	if (failure.requestId) hints.push(`requestId ${failure.requestId}`);
	return { message: `${failure.code}: ${failure.message}`, description: hints.join(' ') };
}

function retryable(code: string, status: number, detail: boolean | undefined): boolean {
	if (NEVER_RETRY.has(code)) return false;
	if (detail !== undefined) return detail;
	if (SAFE_TO_RETRY.has(code) || status === 429) return true;
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
