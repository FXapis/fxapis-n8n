import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class FxapisApi implements ICredentialType {
	name = 'fxapisApi';
	displayName = 'Fxapis API';
	icon: Icon = {
		light: 'file:../nodes/Fxapis/fxapis.svg',
		dark: 'file:../nodes/Fxapis/fxapis.dark.svg',
	};
	documentationUrl = 'https://docs.fxapis.com/authentication';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'An fx_live_ or fx_test_ key. Both reach real brokers. Use a broker demo account while you try the node.',
		},
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.fxapis.com',
			description:
				'Leave this as the production API unless fxapis gives you another HTTPS host. Private hosts are refused.',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/workspace',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 401,
					message:
						'UNAUTHENTICATED: the API key was refused. Paste the whole key, and check it has not been revoked.',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 403,
					message:
						'MISSING_SCOPE: the key is valid but cannot read the workspace. Give it the accounts:read scope.',
				},
			},
		],
	};
}
