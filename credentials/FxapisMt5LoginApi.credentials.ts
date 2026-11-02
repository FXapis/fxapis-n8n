import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

/** The MT5 login the fxapis node sends when it connects an account or replaces its password. Kept out of the workflow. */
export class FxapisMt5LoginApi implements ICredentialType {
	name = 'fxapisMt5LoginApi';
	displayName = 'Fxapis MT5 Login API';
	icon: Icon = {
		light: 'file:../nodes/Fxapis/fxapis.svg',
		dark: 'file:../nodes/Fxapis/fxapis.dark.svg',
	};
	documentationUrl = 'https://docs.fxapis.com/quickstart';
	properties: INodeProperties[] = [
		{
			displayName:
				'This is your broker login, not an fxapis key. The fxapis node sends it only on Account → Connect and Account → Update Password, and fxapis never returns it.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Login',
			name: 'login',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. 51234567',
			description: 'The MT5 account number',
		},
		{
			displayName: 'Server',
			name: 'server',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. ICMarketsSC-Demo',
			description: 'The server name exactly as MetaTrader shows it',
		},
		{
			displayName: 'Trading Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The trading password, not the investor password',
		},
	];
}
