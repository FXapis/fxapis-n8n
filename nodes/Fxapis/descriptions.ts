import type { INodeProperties, NodeParameterValueType } from 'n8n-workflow';
import { collectionFor, OPERATIONS, resources, type Field, type Operation } from './catalog';
import { SEARCH_METHODS } from './methods';

type Show = { resource: string[]; operation: string[] };

const COLLECTION_NAMES: Record<string, string> = {
	additionalFields: 'Additional Fields',
	updateFields: 'Update Fields',
	filters: 'Filters',
	options: 'Options',
};

export function nodeProperties(): INodeProperties[] {
	const byResource = new Map<string, Operation[]>();
	for (const operation of OPERATIONS)
		byResource.set(operation.resource, [...(byResource.get(operation.resource) ?? []), operation]);
	return [resourceProperty(), ...[...byResource.values()].flatMap(operationProperties)];
}

function resourceProperty(): INodeProperties {
	return {
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: resources(),
		default: 'account',
	};
}

function operationProperties(operations: Operation[]): INodeProperties[] {
	const resource = operations[0]?.resource ?? '';
	const properties: INodeProperties[] = [
		// eslint-disable-next-line n8n-nodes-base/node-param-default-missing -- default is the first operation of this resource
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: [resource] } },
			options: operations.map((item) => ({
				name: item.operationName,
				value: item.operation,
				action: item.action,
				description: item.description,
			})),
			default: operations[0]?.operation ?? 'list',
		},
	];
	for (const operation of operations) properties.push(...operationFields(operation));
	return properties;
}

export function operationFields(operation: Operation): INodeProperties[] {
	const show: Show = { resource: [operation.resource], operation: [operation.operation] };
	const properties: INodeProperties[] = [];
	for (const field of operation.params ?? []) properties.push(fieldProperty(field, show));
	for (const target of ['body', 'query'] as const) {
		for (const field of (target === 'body' ? operation.body : operation.query) ?? []) {
			if (field.required) properties.push(fieldProperty(field, show));
		}
	}
	if (operation.idempotent) {
		properties.push({
			displayName: 'Idempotency Key',
			name: 'idempotencyKey',
			type: 'string',
			required: true,
			displayOptions: { show },
			default: '',
			placeholder: 'e.g. {{ $json.signalId }}',
			description:
				'A key derived from what caused this order, such as a signal ID. Reuse it when the run is retried. A new key places a new order.',
		});
	}
	if (operation.list) {
		properties.push(
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: { show },
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { ...show, returnAll: [false] } },
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
			},
		);
	}
	for (const target of ['body', 'query'] as const) {
		const optional = ((target === 'body' ? operation.body : operation.query) ?? []).filter(
			(field) => !field.required,
		);
		if (!optional.length) continue;
		const name = collectionFor(operation, target);
		properties.push({
			displayName: COLLECTION_NAMES[name],
			name,
			type: 'collection',
			placeholder:
				name === 'filters' ? 'Add Filter' : name === 'options' ? 'Add Option' : 'Add Field',
			displayOptions: { show },
			default: {},
			options: optional
				.map((field) => fieldProperty(field))
				.sort((left, right) => left.displayName.localeCompare(right.displayName)),
		});
	}
	return properties;
}

function fieldProperty(field: Field, show?: Show): INodeProperties {
	const property: INodeProperties =
		field.locator && show ? locatorProperty(field) : plainProperty(field);
	if (show) property.displayOptions = { show };
	if (field.required && show) property.required = true;
	return property;
}

function locatorProperty(field: Field): INodeProperties {
	return {
		displayName: field.label,
		name: field.name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: field.description,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: SEARCH_METHODS[field.locator!], searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 0192f4b0-6c1e-7c39-9a6e-5d1f0e2a7b11',
			},
		],
	};
}

function plainProperty(field: Field): INodeProperties {
	const type = field.type === 'list' ? 'string' : field.type;
	const property: INodeProperties = {
		displayName: field.label,
		name: field.name,
		type,
		default: (field.default ?? defaultFor(field)) as NodeParameterValueType,
		description: field.description,
	};
	if (field.placeholder) property.placeholder = field.placeholder;
	if (field.options) property.options = field.options;
	if (field.type === 'number') {
		property.typeOptions = {
			numberPrecision: 0,
			...(field.min !== undefined ? { minValue: field.min } : {}),
			...(field.max !== undefined ? { maxValue: field.max } : {}),
		};
	}
	return property;
}

function defaultFor(field: Field): NodeParameterValueType {
	if (field.type === 'boolean') return false;
	if (field.type === 'number') return 0;
	if (field.type === 'multiOptions') return [];
	if (field.type === 'json') return '{}';
	return '';
}
