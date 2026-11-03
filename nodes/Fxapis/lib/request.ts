/** Builds an fxapis request from node parameters. Does not depend on n8n, so it can be tested on its own. */
import type { Field, Operation } from '../catalog';
import { collectionFor } from '../catalog';

type Value = string | number | boolean | null | Value[] | { [key: string]: Value };
export type Params = Record<string, unknown>;
export type Mt5Login = { login: string; server: string; password: string };

export type BuiltRequest = {
	method: Operation['method'];
	path: string;
	body?: Record<string, Value>;
	query?: Record<string, Value>;
	idempotencyKey?: string;
};

export class ParameterError extends Error {
	description?: string;

	constructor(message: string, description?: string) {
		super(message);
		this.name = 'ParameterError';
		this.description = description;
	}
}

/** `read(name)` returns a top-level parameter, with resource locators already reduced to their value. */
export function buildRequest(
	operation: Operation,
	read: (name: string) => unknown,
	mt5?: Mt5Login,
): BuiltRequest {
	const request: BuiltRequest = { method: operation.method, path: fillPath(operation, read) };
	if (operation.idempotent) {
		const key = String(read('idempotencyKey') ?? '').trim();
		if (!key) {
			throw new ParameterError(
				"'Idempotency Key' is empty",
				'Set a key derived from what caused the order, such as a signal ID. Reuse it when the run is retried: a new key places a new order.',
			);
		}
		request.idempotencyKey = key;
	}
	const body = values(operation, 'body', read);
	if (operation.mt5Login) {
		if (!mt5)
			throw new ParameterError(
				'No fxapis MT5 Login credential',
				'Choose an fxapis MT5 Login credential for this operation.',
			);
		for (const name of operation.mt5Login) body[name] = mt5[name];
	}
	if (
		operation.method !== 'GET' &&
		operation.method !== 'DELETE' &&
		(operation.body || operation.mt5Login)
	) {
		request.body = body;
	}
	const query = values(operation, 'query', read);
	if (Object.keys(query).length) request.query = query;
	return request;
}

function fillPath(operation: Operation, read: (name: string) => unknown): string {
	const labels = new Map((operation.params ?? []).map((field) => [field.name, field.label]));
	return operation.path.replace(/:([A-Za-z]+)/g, (_, name: string) => {
		const value = String(read(name) ?? '').trim();
		if (!value)
			throw new ParameterError(
				`'${labels.get(name) ?? name}' is empty`,
				'Choose one from the list or enter its ID.',
			);
		return encodeURIComponent(value);
	});
}

function values(
	operation: Operation,
	target: 'body' | 'query',
	read: (name: string) => unknown,
): Record<string, Value> {
	const fields = (target === 'body' ? operation.body : operation.query) ?? [];
	const optional = fields.some((field) => !field.required)
		? asRecord(read(collectionFor(operation, target)))
		: {};
	const keys = new Map<string, string>();
	for (const field of fields) {
		if (!field.keyFor) continue;
		const chosen = field.required ? read(field.name) : optional[field.name];
		if (typeof chosen === 'string' && chosen) keys.set(field.keyFor, chosen);
	}
	const out: Record<string, Value> = {};
	const cleared = new Map<string, Field>();
	for (const field of fields) {
		if (field.keyFor) continue;
		const present = field.required || Object.prototype.hasOwnProperty.call(optional, field.name);
		if (!present) continue;
		const raw = field.required ? read(field.name) : optional[field.name];
		if (field.clears) {
			if (raw === true) cleared.set(field.clears, field);
			continue;
		}
		const value = convert(field, raw, target);
		if (value === undefined) continue;
		out[keys.get(field.name) ?? field.sendAs ?? field.name] = value;
	}
	for (const [name, field] of cleared) {
		if (out[name] !== undefined) {
			const set = fields.find((item) => item.name === name)?.label ?? name;
			throw new ParameterError(
				`'${set}' and '${field.label}' are both set`,
				`Remove one of them: set a new value, or clear it.`,
			);
		}
		out[name] = null;
	}
	return out;
}

function convert(field: Field, raw: unknown, target: 'body' | 'query'): Value | undefined {
	if (raw === undefined || raw === null) return undefined;
	switch (field.type) {
		case 'boolean':
			if (field.whenOn !== undefined) return raw === true ? field.whenOn : undefined;
			return target === 'query' ? String(raw === true) : raw === true;
		case 'number': {
			if (raw === '') return undefined;
			const number = Number(raw);
			if (!Number.isFinite(number)) throw new ParameterError(`'${field.label}' is not a number`);
			return number;
		}
		case 'list': {
			const items = (Array.isArray(raw) ? raw : String(raw).split(','))
				.map((item) => String(item).trim())
				.filter(Boolean);
			if (!items.length) return field.required ? items : undefined;
			return target === 'query' ? items.join(',') : items;
		}
		case 'multiOptions': {
			const items = Array.isArray(raw) ? raw.map(String) : [];
			if (target === 'query') return items.length ? items.join(',') : undefined;
			return items.length || !field.omitEmpty ? items : undefined;
		}
		case 'json':
			return parseJson(field, raw);
		default: {
			const text = typeof raw === 'string' ? raw.trim() : String(raw);
			if (!text && !field.required) return undefined;
			return text;
		}
	}
}

function parseJson(field: Field, raw: unknown): Value | undefined {
	if (typeof raw !== 'string') return raw as Value;
	if (!raw.trim()) return undefined;
	const parsed = tryParse(raw);
	if (!parsed.ok)
		throw new ParameterError(
			`'${field.label}' is not valid JSON`,
			'Check the quotes and brackets, or build the value with an expression.',
		);
	return parsed.value;
}

function tryParse(raw: string): { ok: true; value: Value } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(raw) as Value };
	} catch {
		return { ok: false };
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
