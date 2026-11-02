import {
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { SUBSCRIBABLE_EVENTS } from './events';
import { verifyWebhook, WebhookVerificationError } from '../Fxapis/lib/signature';
import { asNodeError, fxapisRequest, isNotFound } from '../Fxapis/transport';

export class FxapisTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'fxapis Trigger',
		name: 'fxapisTrigger',
		icon: { light: 'file:../Fxapis/fxapis.svg', dark: 'file:../Fxapis/fxapis.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].length ? $parameter["events"].join(", ") : "every event"}}',
		description:
			'Start a workflow when fxapis sends a signed webhook. The webhook URL must be public HTTPS on port 443.',
		defaults: { name: 'fxapis Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'fxapisApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'fxapis' }],
		properties: [
			{
				displayName:
					'fxapis delivers only to public HTTPS on port 443. A self-hosted n8n needs a reverse proxy or a tunnel on 443. Each event can arrive more than once: de-duplicate on its ID.',
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
				description: 'Leave empty to receive every event',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return await endpointMatches(this);
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const created = await fxapisRequest.call(this, {
					method: 'POST',
					path: '/v1/webhooks',
					body: {
						url: this.getNodeWebhookUrl('default'),
						events: configuredEvents(this),
						description: 'n8n fxapis trigger',
					},
				});
				const endpoint = (created.data ?? {}) as IDataObject;
				if (typeof endpoint.id !== 'string' || typeof endpoint.secret !== 'string') return false;
				const data = this.getWorkflowStaticData('node');
				data.endpointId = endpoint.id;
				data.secret = endpoint.secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (typeof data.endpointId === 'string') await deleteEndpoint(this, data.endpointId);
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
			const message =
				error instanceof WebhookVerificationError ? error.message : 'signature check failed';
			return rejectWebhook(this, 401, message);
		}
	}
}

/** True only when the stored endpoint still exists, is enabled, and points at this URL with these events. A stale one is removed so n8n creates a fresh one. */
async function endpointMatches(caller: IHookFunctions): Promise<boolean> {
	const data = caller.getWorkflowStaticData('node');
	if (typeof data.endpointId !== 'string' || typeof data.secret !== 'string') return false;
	let endpoint: IDataObject;
	try {
		const response = await fxapisRequest.call(caller, {
			method: 'GET',
			path: `/v1/webhooks/${encodeURIComponent(data.endpointId)}`,
		});
		endpoint = (response.data ?? {}) as IDataObject;
	} catch (error) {
		if (!isNotFound(error)) throw asNodeError(caller, error);
		forget(data);
		return false;
	}
	const events = Array.isArray(endpoint.events) ? (endpoint.events as string[]) : [];
	const matches =
		endpoint.enabled === true &&
		endpoint.url === caller.getNodeWebhookUrl('default') &&
		sameSet(events, configuredEvents(caller));
	if (matches) return true;
	await deleteEndpoint(caller, data.endpointId);
	forget(data);
	return false;
}

async function deleteEndpoint(caller: IHookFunctions, endpointId: string): Promise<void> {
	try {
		await fxapisRequest.call(caller, {
			method: 'DELETE',
			path: `/v1/webhooks/${encodeURIComponent(endpointId)}`,
		});
	} catch (error) {
		if (!isNotFound(error)) throw asNodeError(caller, error);
	}
}

function forget(data: IDataObject): void {
	delete data.endpointId;
	delete data.secret;
}

function configuredEvents(caller: IHookFunctions): string[] {
	const events = caller.getNodeParameter('events', []) as unknown;
	return Array.isArray(events) ? events.map(String) : [];
}

function sameSet(left: string[], right: string[]): boolean {
	const a = [...new Set(left)].sort();
	const b = [...new Set(right)].sort();
	return a.length === b.length && a.every((value, index) => value === b[index]);
}

function rejectWebhook(
	caller: IWebhookFunctions,
	statusCode: number,
	message: string,
): IWebhookResponseData {
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
