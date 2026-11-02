/** Verifies fxapis-signature. The signed string is `timestamp.rawBody`. Either v1 value matches during a rotation. */

export class WebhookVerificationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'WebhookVerificationError';
	}
}

export async function verifyWebhook(
	rawBody: string,
	signatureHeader: string | undefined,
	secret: string,
	options: { toleranceSec?: number; now?: number } = {},
): Promise<unknown> {
	if (!signatureHeader) throw new WebhookVerificationError('missing fxapis-signature header');
	let timestamp = Number.NaN;
	const signatures: string[] = [];
	for (const part of signatureHeader.split(',')) {
		const [key, value] = part.trim().split('=', 2);
		if (key === 't') timestamp = Number(value);
		else if (key === 'v1' && value) signatures.push(value);
	}
	if (!Number.isInteger(timestamp) || signatures.length === 0) {
		throw new WebhookVerificationError('malformed fxapis-signature header');
	}
	const now = Math.floor((options.now ?? Date.now()) / 1000);
	if (Math.abs(now - timestamp) > (options.toleranceSec ?? 300)) {
		throw new WebhookVerificationError('signature timestamp is outside the tolerance');
	}
	const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
	if (!signatures.some((signature) => sameText(signature, expected))) {
		throw new WebhookVerificationError('signature does not match');
	}
	return JSON.parse(rawBody) as unknown;
}

async function hmacHex(secret: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
	return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sameText(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let diff = 0;
	for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
	return diff === 0;
}
