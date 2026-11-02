const PRIVATE_V4 =
	/^(0\.\d+\.\d+\.\d+|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|169\.254\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+)$/;
const PRIVATE_NAMES = /(^|\.)(localhost|local|internal|intranet|lan|home\.arpa)\.?$/i;

export class ApiBaseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ApiBaseError';
	}
}

function reject(message: string): never {
	throw new ApiBaseError(message);
}

/** The URL parser has already turned decimal, octal and hex IPv4 forms into dotted quads. */
function isPrivateHost(hostname: string): boolean {
	if (PRIVATE_V4.test(hostname) || PRIVATE_NAMES.test(hostname)) return true;
	if (!hostname.startsWith('[')) return !hostname.includes('.');
	const v6 = hostname.slice(1, -1).toLowerCase();
	if (v6 === '::' || v6 === '::1') return true;
	if (/^f[cd][0-9a-f]{0,2}:/.test(v6) || /^fe[89ab][0-9a-f]?:/.test(v6)) return true;
	const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v6);
	if (mapped) {
		const high = parseInt(mapped[1], 16);
		const low = parseInt(mapped[2], 16);
		return PRIVATE_V4.test(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
	}
	return v6.startsWith('::ffff:');
}

/** The credential may only point at a public HTTPS API. The default is production. */
export function assertApiBase(value: string | undefined): string {
	const base = (value || 'https://api.fxapis.com').trim().replace(/\/+$/, '');
	let url: URL;
	try {
		url = new URL(base);
	} catch {
		return reject('API base URL is not a URL.');
	}
	if (url.protocol !== 'https:') return reject('API base URL must use HTTPS.');
	if (url.username || url.password)
		return reject('API base URL must not carry a username or password.');
	if (isPrivateHost(url.hostname)) return reject('API base URL must not point at a private host.');
	return url.origin;
}
