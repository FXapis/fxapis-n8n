// Lets node --test load the TypeScript sources as they are.
// The sources import each other without an extension, as tsc expects: those resolve to .ts.
// n8n-workflow ships a UMD build whose named exports Node cannot see, so it is served through a small ESM wrapper.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const base = JSON.stringify(pathToFileURL(`${process.cwd()}/package.json`).href);

const hooks = `
import { createRequire } from 'node:module';

const WRAPPED = 'fxapis-test:n8n-workflow';
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export async function resolve(specifier, context, next) {
	if (specifier === 'n8n-workflow') return { url: WRAPPED, shortCircuit: true };
	const local = context.parentURL && !context.parentURL.includes('/node_modules/');
	if (local && specifier.startsWith('.') && !/[.](ts|js|mjs|cjs|json)$/.test(specifier)) {
		return next(specifier + '.ts', context);
	}
	return next(specifier, context);
}

export async function load(url, context, next) {
	if (url !== WRAPPED) return next(url, context);
	const names = Object.keys(createRequire(${base})('n8n-workflow')).filter((name) => IDENTIFIER.test(name) && name !== 'default');
	const lines = [
		"import { createRequire } from 'node:module';",
		'const m = createRequire(' + JSON.stringify(${base}) + ")('n8n-workflow');",
		'export default m;',
		...names.map((name) => 'export const ' + name + ' = m.' + name + ';'),
	];
	return { format: 'module', source: lines.join(String.fromCharCode(10)), shortCircuit: true };
}`;

register(`data:text/javascript,${encodeURIComponent(hooks)}`);
