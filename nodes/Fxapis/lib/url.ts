const PRIVATE = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|169\.254\.169\.254|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/i;

export class ApiBaseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ApiBaseError';
	}
}

function reject(message: string): never {
	const error = new ApiBaseError(message);
	throw error;
}

/** The credential may only point at a public HTTPS API. The default is production. */
export function assertApiBase(value: string | undefined): string {
	const base = (value || 'https://api.fxapis.com').replace(/\/+$/, '');
	let url: URL;
	try {
		url = new URL(base);
	} catch {
		return reject('API base URL is not a URL.');
	}
	if (url.protocol !== 'https:') return reject('API base URL must use HTTPS.');
	if (url.username || url.password) return reject('API base URL must not carry a username or password.');
	if (PRIVATE.test(url.hostname) || url.hostname.endsWith('.local')) {
		return reject('API base URL must not point at a private host.');
	}
	return url.origin;
}
