import {
	NodeConnectionTypes,
	NodeOperationError,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type IExecuteFunctions,
	type INodeCredentialTestResult,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { OPERATIONS, operationFor, type Operation } from './catalog';
import { nodeProperties } from './descriptions';
import { collect } from './lib/paginate';
import { buildRequest, ParameterError, type Mt5Login } from './lib/request';
import { listSearch } from './methods';
import { asNodeError, failureOf, fxapisRequest } from './transport';

const MT5_OPERATIONS = OPERATIONS.filter((item) => item.mt5Login);

export class Fxapis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'fxapis',
		name: 'fxapis',
		icon: { light: 'file:fxapis.svg', dark: 'file:fxapis.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Trade MetaTrader 5 accounts through the fxapis API. Test keys reach real brokers.',
		defaults: { name: 'fxapis' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{ name: 'fxapisApi', required: true },
			{
				name: 'fxapisMt5LoginApi',
				required: true,
				testedBy: 'fxapisMt5LoginTest',
				displayOptions: {
					show: {
						resource: [...new Set(MT5_OPERATIONS.map((item) => item.resource))],
						operation: MT5_OPERATIONS.map((item) => item.operation),
					},
				},
			},
		],
		properties: nodeProperties(),
	};

	methods = {
		listSearch,
		credentialTest: {
			/** fxapis cannot try an MT5 login without connecting it, so this checks the fields are filled in and well formed. */
			async fxapisMt5LoginTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const data = credential.data ?? {};
				if (!/^\d{1,32}$/.test(String(data.login ?? '').trim()))
					return { status: 'Error', message: 'Login must be the MT5 account number, digits only.' };
				if (!String(data.server ?? '').trim())
					return {
						status: 'Error',
						message: 'Server is empty. Enter it exactly as MetaTrader shows it.',
					};
				if (!String(data.password ?? ''))
					return { status: 'Error', message: 'Trading password is empty.' };
				return {
					status: 'OK',
					message:
						'The fields are filled in. The broker checks the login when the account connects.',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operationName = this.getNodeParameter('operation', i) as string;
				const operation = operationFor(resource, operationName);
				if (!operation)
					throw new NodeOperationError(
						this.getNode(),
						`Unknown operation ${resource}.${operationName}`,
						{ itemIndex: i },
					);
				for (const json of await run(this, operation, i))
					out.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: errorJson(error) }, pairedItem: { item: i } });
					continue;
				}
				throw asNodeError(this, error, i);
			}
		}
		return [out];
	}
}

async function run(
	caller: IExecuteFunctions,
	operation: Operation,
	itemIndex: number,
): Promise<IDataObject[]> {
	const read = (name: string) =>
		caller.getNodeParameter(name, itemIndex, undefined, { extractValue: true });
	const mt5 = operation.mt5Login ? await mt5Login(caller, itemIndex) : undefined;
	const request = buildRequest(operation, read, mt5);
	const send = (query?: IDataObject) =>
		fxapisRequest.call(caller, {
			method: request.method,
			path: request.path,
			body: request.body as IDataObject | undefined,
			query,
			idempotencyKey: request.idempotencyKey,
			itemIndex,
		});
	if (operation.list) {
		const returnAll = caller.getNodeParameter('returnAll', itemIndex, false) as boolean;
		const limit = returnAll ? 0 : (caller.getNodeParameter('limit', itemIndex, 50) as number);
		const page = async (query: Record<string, unknown>) => await send(query as IDataObject);
		return (await collect(
			page,
			request.query ?? {},
			operation.list,
			returnAll,
			limit,
		)) as IDataObject[];
	}
	const response = await send(request.query as IDataObject | undefined);
	const data = 'data' in response ? response.data : response;
	if (Array.isArray(data)) return data as IDataObject[];
	if (data && typeof data === 'object') return [data as IDataObject];
	return [{ data: data ?? null }];
}

async function mt5Login(caller: IExecuteFunctions, itemIndex: number): Promise<Mt5Login> {
	const credentials = await caller.getCredentials('fxapisMt5LoginApi', itemIndex);
	return {
		login: String(credentials.login ?? '').trim(),
		server: String(credentials.server ?? '').trim(),
		password: String(credentials.password ?? ''),
	};
}

function errorJson(error: unknown): IDataObject {
	const failure = failureOf(error);
	if (failure) {
		return {
			code: failure.code,
			message: failure.message,
			status: failure.status,
			requestId: failure.requestId ?? null,
			retryable: failure.retryable,
			retryAfter: failure.retryAfter ?? null,
		};
	}
	return {
		code: error instanceof ParameterError ? 'INVALID_PARAMETER' : 'REQUEST_FAILED',
		message: error instanceof Error ? error.message : 'Request failed',
		status: null,
		requestId: null,
		retryable: false,
		retryAfter: null,
	};
}
