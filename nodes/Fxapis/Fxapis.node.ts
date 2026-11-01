import { NodeConnectionTypes, NodeOperationError, type IDataObject, type IExecuteFunctions, type INodeExecutionData, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { operationFor } from './catalog';
import { nodeProperties } from './descriptions';
import { fxapisRequest } from './transport';

const PATH_NAMES = new Set(['accountId', 'orderId', 'waveId', 'positionId']);

export class Fxapis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'fxapis',
		name: 'fxapis',
		icon: { light: 'file:fxapis.svg', dark: 'file:fxapis.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Trade MetaTrader 5 accounts through the fxapis API. Test keys reach real brokers.',
		defaults: { name: 'fxapis' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'fxapisApi', required: true }],
		properties: nodeProperties(),
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operationName = this.getNodeParameter('operation', i) as string;
				const operation = operationFor(resource, operationName);
				if (!operation) throw new NodeOperationError(this.getNode(), `Unknown operation ${resource}.${operationName}`, { itemIndex: i });
				const idempotencyKey = operation.idempotent ? String(this.getNodeParameter('idempotencyKey', i)) : undefined;
				if (operation.idempotent && !idempotencyKey?.trim()) {
					throw new NodeOperationError(this.getNode(), 'An idempotency key is required. Reuse the same key if this run is retried. A new key places a new order.', { itemIndex: i });
				}
				const response = await fxapisRequest.call(this, {
					method: operation.method,
					path: fillPath(operation.path, readFields(this, operation.body ?? [], i)),
					body: requestBody(this, operation, i),
					query: omitEmpty(readFields(this, operation.query ?? [], i)),
					...(idempotencyKey ? { idempotencyKey } : {}),
					itemIndex: i,
				});
				out.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: error instanceof Error ? error.message : 'Request failed' }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error instanceof Error ? error : new Error('Request failed'), { itemIndex: i });
			}
		}
		return [out];
	}
}

function requestBody(caller: IExecuteFunctions, operation: { jsonBody?: boolean; body?: Array<{ name: string }> }, itemIndex: number): IDataObject | undefined {
	if (operation.jsonBody) return caller.getNodeParameter('jsonBody', itemIndex) as IDataObject;
	const fields = readFields(caller, operation.body ?? [], itemIndex);
	const body: IDataObject = {};
	for (const [name, value] of Object.entries(fields)) {
		if (PATH_NAMES.has(name) || value === '' || value === undefined) continue;
		if (name === 'naming' || name === 'marketName') continue;
		body[name] = value;
	}
	const naming = fields.naming;
	const marketName = fields.marketName;
	if (typeof naming === 'string' && typeof marketName === 'string' && marketName) body[naming] = marketName;
	return Object.keys(body).length ? body : undefined;
}

function readFields(caller: IExecuteFunctions, fields: Array<{ name: string }>, itemIndex: number): IDataObject {
	const out: IDataObject = {};
	for (const field of fields) {
		if (field.name === 'password') out.password = caller.getNodeParameter(field.name, itemIndex) as string;
		else out[field.name] = caller.getNodeParameter(field.name, itemIndex) as IDataObject[string];
	}
	return out;
}

function omitEmpty(fields: IDataObject): IDataObject {
	return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== '' && value !== false && value !== undefined));
}

function fillPath(path: string, fields: IDataObject): string {
	return path.replace(/:([A-Za-z]+)/g, (_, name: string) => encodeURIComponent(String(fields[name] ?? '')));
}
