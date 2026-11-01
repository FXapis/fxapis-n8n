import type { INodeProperties } from 'n8n-workflow';
import { OPERATIONS, resources, type Field, type Operation } from './catalog';

const PATH_FIELDS = new Set(['accountId', 'orderId', 'waveId', 'positionId', 'naming', 'marketName']);

export function nodeProperties(): INodeProperties[] {
	const byResource = new Map<string, typeof OPERATIONS>();
	for (const operation of OPERATIONS) byResource.set(operation.resource, [...(byResource.get(operation.resource) ?? []), operation]);
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
	for (const operation of operations) {
		const show = { resource: [operation.resource], operation: [operation.operation] };
		for (const field of operation.body ?? []) properties.push(fieldProperty(field, show));
		for (const field of operation.query ?? []) properties.push(fieldProperty(field, show));
		if (operation.idempotent) {
			properties.push({
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				required: true,
				displayOptions: { show },
				default: '',
				description: 'A stable key for this order. Reuse it on retry. A new key is a new order. Do not use a fresh UUID on every run.',
			});
		}
		if (operation.jsonBody) {
			properties.push({
				displayName: 'Body',
				name: 'jsonBody',
				type: 'json',
				required: true,
				displayOptions: { show },
				default: '{}',
				description: operation.jsonDescription ?? 'The request body exactly as the API documents it. See the execution-waves reference.',
			});
		}
	}
	return properties;
}

function fieldProperty(field: Field, show: { resource: string[]; operation: string[] }): INodeProperties {
	const property: INodeProperties = {
		displayName: field.label,
		name: field.name,
		type: field.password ? 'string' : field.type,
		required: field.required === true,
		displayOptions: { show },
		default: field.default ?? (field.type === 'boolean' ? false : field.type === 'number' ? 0 : ''),
		description: field.description,
	};
	if (field.password) property.typeOptions = { password: true };
	if (field.options) property.options = field.options;
	if (PATH_FIELDS.has(field.name) && field.required !== false) property.required = true;
	return property;
}
