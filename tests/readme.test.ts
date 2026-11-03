/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { OPERATIONS, resources } from '../nodes/Fxapis/catalog.ts';
import { SUBSCRIBABLE_EVENTS } from '../nodes/FxapisTrigger/events.ts';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const version = (
	JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
		version: string;
	}
).version;

/** The rows of the README table under `### <heading>`, up to the next heading. */
function rowsUnder(heading: string): string[] {
	const start = readme.indexOf(`\n### ${heading}\n`);
	assert.notEqual(start, -1, `README has no "### ${heading}" section`);
	const rest = readme.slice(start + heading.length + 6);
	const end = rest.search(/\n#{2,3} /);
	return (end === -1 ? rest : rest.slice(0, end))
		.split('\n')
		.filter((line) => line.startsWith('| '));
}

test('the README lists every operation under its resource, and nothing else', () => {
	for (const { name, value } of resources()) {
		const listed = rowsUnder(name)
			.slice(1)
			.map((line) => line.split('|')[1].trim());
		const operations = OPERATIONS.filter((item) => item.resource === value);
		assert.deepEqual(
			listed,
			operations.map((item) => item.operationName),
			name,
		);
		for (const operation of operations.filter((item) => item.idempotent)) {
			const row = rowsUnder(name).find((line) => line.startsWith(`| ${operation.operationName} |`));
			assert.match(row ?? '', /Idempotency key required/, `${name} → ${operation.operationName}`);
		}
	}
	assert.match(
		readme,
		new RegExp(`has ${resources().length} resources and ${OPERATIONS.length} operations`),
	);
});

test('the README lists every trigger event', () => {
	for (const event of SUBSCRIBABLE_EVENTS) assert.match(readme, new RegExp(`\\| \`${event}\` \\|`));
});

test('the README has this version in its history', () => {
	assert.match(readme, new RegExp(`\\| ${version.replace(/\./g, '\\.')} \\|`));
});

test('the README describes no internals', () => {
	assert.doesNotMatch(readme, /staff|runbook|railway|handoff|\.env\b|internal path/i);
});
