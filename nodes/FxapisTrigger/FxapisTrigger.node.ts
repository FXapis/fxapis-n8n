import { NodeConnectionTypes, type IDataObject, type IHookFunctions, type INodeType, type INodeTypeDescription, type IWebhookFunctions, type IWebhookResponseData } from 'n8n-workflow';
import { SUBSCRIBABLE_EVENTS } from './events';
import { verifyWebhook, WebhookVerificationError } from '../Fxapis/lib/signature';
import { fxapisRequest } from '../Fxapis/transport';

export class FxapisTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'fxapis Trigger',
		name: 'fxapisTrigger',
		icon: { light: 'file:../Fxapis/fxapis.svg', dark: 'file:../Fxapis/fxapis.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"]}}',
		description: 'Start a workflow when fxapis sends a signed webhook. The production URL must be public HTTPS.',
		defaults: { name: 'fxapis Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'fxapisApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'fxapis' }],
		properties: [
			{
				displayName: 'The production webhook URL must be reachable from the public internet. A localhost test URL is refused by the API. Leave events empty to receive every event except webhook.test.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: SUBSCRIBABLE_EVENTS.map((value) => ({ name: value, value })),
				default: [],
				description: 'Leave empty to subscribe to every event',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				return typeof data.endpointId === 'string' && typeof data.secret === 'string';
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const events = this.getNodeParameter('events') as string[];
				const created = await fxapisRequest.call(this, {
					method: 'POST',
					path: '/v1/webhooks',
					body: { url: this.getNodeWebhookUrl('default'), events, description: 'n8n fxapis trigger' },
				});
				const data = this.getWorkflowStaticData('node');
				data.endpointId = created.id;
				data.secret = created.secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (typeof data.endpointId === 'string') {
					await fxapisRequest.call(this, { method: 'DELETE', path: `/v1/webhooks/${encodeURIComponent(data.endpointId)}` });
				}
				delete data.endpointId;
				delete data.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const data = this.getWorkflowStaticData('node');
		const secret = typeof data.secret === 'string' ? data.secret : '';
		const header = headerValue(this.getHeaderData()['fxapis-signature']);
		const rawBody = rawRequestBody(this.getRequestObject());
		if (!secret || !rawBody) {
			return rejectWebhook(this, 400, 'missing raw body or signing secret');
		}
		try {
			const event = await verifyWebhook(rawBody, header, secret);
			return { workflowData: [[{ json: event as IDataObject }]] };
		} catch (error) {
			const message = error instanceof WebhookVerificationError ? error.message : 'signature check failed';
			return rejectWebhook(this, 401, message);
		}
	}
}

function rejectWebhook(caller: IWebhookFunctions, statusCode: number, message: string): IWebhookResponseData {
	const response = caller.getResponseObject();
	response.status(statusCode).json({ error: message });
	return { noWebhookResponse: true };
}

function headerValue(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function rawRequestBody(request: object): string | undefined {
	const raw = (request as { rawBody?: Buffer | string }).rawBody;
	if (typeof raw === 'string') return raw;
	if (raw) return raw.toString('utf8');
	return undefined;
}
