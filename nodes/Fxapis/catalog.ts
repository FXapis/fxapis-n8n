export type Locator =
	'account' | 'order' | 'position' | 'wave' | 'webhook' | 'strategy' | 'subscription' | 'invoice';

export type Field = {
	name: string;
	label: string;
	/** `list` is a comma-separated string sent as an array. `json` is parsed before it is sent. */
	type: 'string' | 'number' | 'boolean' | 'options' | 'multiOptions' | 'json' | 'list';
	/** Required fields are top-level parameters. Optional ones go in a collection and are sent only when added. */
	required?: boolean;
	description: string;
	default?: string | number | boolean | string[];
	options?: Array<{ name: string; value: string; description?: string }>;
	placeholder?: string;
	min?: number;
	max?: number;
	locator?: Locator;
	/** The API name, when it differs from the parameter name. */
	sendAs?: string;
	/** On an options field: its value is the API name the field `keyFor` is sent under. */
	keyFor?: string;
	/** On a boolean field: when on, sends `clears: null`. */
	clears?: string;
	/** On a boolean field: when on, sends this value; when off, nothing. */
	whenOn?: string;
};

export type Operation = {
	resource: string;
	resourceName: string;
	operation: string;
	operationName: string;
	action: string;
	description: string;
	method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	path: string;
	idempotent?: boolean;
	/** Path parameters, named as in `path`. */
	params?: Field[];
	body?: Field[];
	query?: Field[];
	/** A list read: Return All and Limit. `cursor` follows page.nextCursor, `max` is the API's page size limit, `after` pages by the last id. */
	list?: { cursor?: boolean; max?: number; after?: string };
	/** Body fields read from the fxapis MT5 Login credential. */
	mt5Login?: Array<'login' | 'server' | 'password'>;
	/** The collection optional body fields go in. */
	optional?: 'additionalFields' | 'updateFields';
};

const EVENTS = [
	'order.filled',
	'order.rejected',
	'order.unresolved',
	'order.resolved',
	'order.cancelled',
	'position.opened',
	'position.closed',
	'account.state_changed',
	'wave.settled',
	'wave.updated',
	'copy.executed',
	'copy.skipped',
	'copy.failed',
	'copy.subscription_stopped',
	'copy.drift_corrected',
	'copy.master_disconnected',
];
const eventOptions = EVENTS.map((value) => ({ name: value, value }));
const ORDER_STATES = [
	'accepted',
	'validating',
	'sending',
	'working',
	'completed',
	'filled',
	'partially_filled',
	'rejected',
	'failed',
	'unknown',
	'cancelled',
	'expired',
];
const titled = (value: string) =>
	value
		.split('_')
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');

const account: Field = {
	name: 'accountId',
	label: 'Account',
	type: 'string',
	required: true,
	locator: 'account',
	description: 'The fxapis account, not the MT5 login',
};
const order: Field = {
	name: 'orderId',
	label: 'Order',
	type: 'string',
	required: true,
	locator: 'order',
	description: 'The fxapis order',
};
const position: Field = {
	name: 'positionId',
	label: 'Position',
	type: 'string',
	required: true,
	locator: 'position',
	description: 'The broker position ticket',
};
const wave: Field = {
	name: 'waveId',
	label: 'Multi-Account Order',
	type: 'string',
	required: true,
	locator: 'wave',
	description: 'The multi-account order',
};
const webhook: Field = {
	name: 'webhookId',
	label: 'Webhook',
	type: 'string',
	required: true,
	locator: 'webhook',
	description: 'The webhook endpoint',
};
const strategy: Field = {
	name: 'strategyId',
	label: 'Strategy',
	type: 'string',
	required: true,
	locator: 'strategy',
	description: 'The copy strategy',
};
const subscription: Field = {
	name: 'subscriptionId',
	label: 'Subscription',
	type: 'string',
	required: true,
	locator: 'subscription',
	description: 'The copy subscription',
};
const invoice: Field = {
	name: 'invoiceId',
	label: 'Invoice',
	type: 'string',
	required: true,
	locator: 'invoice',
	description: 'The invoice',
};
const event: Field = {
	name: 'eventId',
	label: 'Event ID',
	type: 'string',
	required: true,
	description: "The event ID, as in the event's ID field",
	placeholder: 'e.g. 0192f4b0-6c1e-7c39-9a6e-5d1f0e2a7b11',
};
const delivery: Field = {
	name: 'deliveryId',
	label: 'Delivery ID',
	type: 'string',
	required: true,
	description: 'The delivery attempt ID',
};

const side: Field = {
	name: 'side',
	label: 'Side',
	type: 'options',
	required: true,
	description: 'Buy or sell',
	options: [
		{ name: 'Buy', value: 'buy' },
		{ name: 'Sell', value: 'sell' },
	],
	default: 'buy',
};
const volume: Field = {
	name: 'volume',
	label: 'Volume',
	type: 'string',
	required: true,
	placeholder: 'e.g. 0.01',
	description: 'Lots, as text such as 0.01, so no rounding reaches the broker',
};
const naming: Field = {
	name: 'naming',
	label: 'Name the Market By',
	type: 'options',
	required: true,
	keyFor: 'marketName',
	description: 'Send the broker symbol or an fxapis instrument, not both',
	options: [
		{
			name: 'Broker Symbol',
			value: 'symbol',
			description: 'As this broker names it, e.g. EURUSD.a',
		},
		{
			name: 'Instrument',
			value: 'instrument',
			description: "An fxapis instrument, traded as this account's own symbol for it",
		},
	],
	default: 'symbol',
};
const marketName: Field = {
	name: 'marketName',
	label: 'Symbol or Instrument',
	type: 'string',
	required: true,
	placeholder: 'e.g. EURUSD',
	description: 'The broker symbol or the instrument, as chosen above',
};
const stopLoss: Field = {
	name: 'stopLoss',
	label: 'Stop Loss',
	type: 'string',
	description: 'Absolute price, not a distance',
};
const takeProfit: Field = {
	name: 'takeProfit',
	label: 'Take Profit',
	type: 'string',
	description: 'Absolute price, not a distance',
};
const deviation: Field = {
	name: 'deviationPoints',
	label: 'Deviation Points',
	type: 'number',
	min: 0,
	max: 10000,
	default: 20,
	description:
		'Maximum slippage in points. Too small and a fast market returns a requote instead of a fill.',
};
const comment: Field = {
	name: 'comment',
	label: 'Comment',
	type: 'string',
	description: 'Stored on the MT5 order, cut to fit: the first 17 characters, plain ASCII',
};
const clientOrderId: Field = {
	name: 'clientOrderId',
	label: 'Client Order ID',
	type: 'string',
	description: 'Your own reference, echoed back. It does not need to be unique.',
};
const expiresAt: Field = {
	name: 'expiresAt',
	label: 'Expires At',
	type: 'string',
	placeholder: 'e.g. 2026-11-01T18:00:00Z',
	description: 'ISO 8601 time the broker drops the order. Leave out for good-till-cancelled.',
};
const since: Field = {
	name: 'since',
	label: 'Since',
	type: 'string',
	placeholder: 'e.g. 2026-11-01T00:00:00Z',
	description: 'ISO 8601 time, inclusive',
};
const until: Field = {
	name: 'until',
	label: 'Until',
	type: 'string',
	placeholder: 'e.g. 2026-11-02T00:00:00Z',
	description: 'ISO 8601 time, exclusive',
};
const mode: Field = {
	name: 'mode',
	label: 'Mode',
	type: 'options',
	required: true,
	default: 'warm_on_demand',
	description:
		'When the account is connected. Orders are fastest on always on; cost runs the other way.',
	options: [
		{ name: 'Always On', value: 'always_on', description: 'Stays connected' },
		{
			name: 'On Demand',
			value: 'warm_on_demand',
			description: 'Connects for the first order or a prepare, and goes offline when idle',
		},
		{ name: 'Cold', value: 'cold', description: 'Connects only when you bring it online' },
	],
};
const events: Field = {
	name: 'events',
	label: 'Events',
	type: 'multiOptions',
	options: eventOptions,
	default: [],
	description: 'The events this endpoint receives. None means every event.',
};

const barrierPolicy: Field = {
	name: 'barrierPolicy',
	label: 'Barrier Policy',
	type: 'options',
	default: 'release-ready',
	description: 'What to do when some accounts are not online in time',
	options: [
		{
			name: 'Release Ready',
			value: 'release-ready',
			description: 'Trade on the accounts that are online',
		},
		{
			name: 'All or Nothing',
			value: 'all-or-nothing',
			description: 'Trade on none unless all are online',
		},
		{ name: 'Wait', value: 'wait', description: 'Keep waiting until the expiry' },
	],
};
const waveExecuteAt: Field = {
	name: 'executeAt',
	label: 'Execute At',
	type: 'string',
	placeholder: 'e.g. 2026-11-01T14:30:00Z',
	description: 'ISO 8601 time to send the orders',
};
const waveExpiresAt: Field = {
	name: 'expiresAt',
	label: 'Expires At',
	type: 'string',
	placeholder: 'e.g. 2026-11-01T14:35:00Z',
	description: 'Stop waiting for accounts that are not online after this ISO 8601 time',
};

const A = { resource: 'account', resourceName: 'Account' };
const O = { resource: 'order', resourceName: 'Order' };
const P = { resource: 'position', resourceName: 'Position' };
const D = { resource: 'deal', resourceName: 'Deal' };
const W = { resource: 'wave', resourceName: 'Multi-Account Order' };
const M = { resource: 'market', resourceName: 'Market Data' };
const I = { resource: 'instrument', resourceName: 'Instrument' };
const B = { resource: 'brokerServer', resourceName: 'Broker Server' };
const E = { resource: 'event', resourceName: 'Event' };
const H = { resource: 'webhook', resourceName: 'Webhook' };
const S = { resource: 'strategy', resourceName: 'Copy Strategy' };
const U = { resource: 'subscription', resourceName: 'Copy Subscription' };
const C = { resource: 'copy', resourceName: 'Copy Trading' };
const L = { resource: 'billing', resourceName: 'Billing' };
const K = { resource: 'workspace', resourceName: 'Workspace' };

const COPY_PAUSED =
	'Copy trading is coming soon: until then the API answers 503 COPY_TRADING_PAUSED.';

export const OPERATIONS: Operation[] = [
	{
		...A,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many accounts',
		description: 'List the MT5 accounts in the workspace',
		method: 'GET',
		path: '/v1/accounts',
		list: {},
	},
	{
		...A,
		operation: 'get',
		operationName: 'Get',
		action: 'Get an account',
		description: 'Retrieve an account with its last balance and equity',
		method: 'GET',
		path: '/v1/accounts/:accountId',
		params: [account],
	},
	{
		...A,
		operation: 'connect',
		operationName: 'Connect',
		action: 'Connect an MT5 account',
		description:
			'Connect an MT5 account with the login, server and trading password from an fxapis MT5 Login credential',
		method: 'POST',
		path: '/v1/accounts',
		mt5Login: ['login', 'server', 'password'],
		body: [
			mode,
			{ name: 'label', label: 'Label', type: 'string', description: 'A name you will recognise' },
		],
	},
	{
		...A,
		operation: 'status',
		operationName: 'Get Status',
		action: 'Get account status',
		description: 'Read the account state. Poll until it is ready before sending an order.',
		method: 'GET',
		path: '/v1/accounts/:accountId/status',
		params: [account],
	},
	{
		...A,
		operation: 'figures',
		operationName: 'Get Figures',
		action: 'Get balance equity and margin',
		description: 'Balance, equity and margin of an account',
		method: 'GET',
		path: '/v1/accounts/:accountId/figures',
		params: [account],
		query: [
			{
				name: 'fresh',
				label: 'Fresh',
				type: 'boolean',
				default: true,
				description:
					'Whether to ask the terminal now instead of using the last snapshot. The account must be online.',
			},
		],
	},
	{
		...A,
		operation: 'events',
		operationName: 'Get Activity',
		action: 'Get account activity',
		description:
			'What happened to an account, newest first: added, logging in, refused by the broker, online, taken offline',
		method: 'GET',
		path: '/v1/accounts/:accountId/events',
		params: [account],
		list: { max: 200 },
	},
	{
		...A,
		operation: 'warm',
		operationName: 'Bring Online',
		action: 'Bring an account online',
		description: 'Start the account and return at once. Poll its status until it is ready.',
		method: 'POST',
		path: '/v1/accounts/:accountId/warm',
		params: [account],
	},
	{
		...A,
		operation: 'prepare',
		operationName: 'Bring Many Online',
		action: 'Bring several accounts online',
		description:
			'Start every listed account and return at once. Poll each status until it is ready.',
		method: 'POST',
		path: '/v1/accounts/prepare',
		body: [
			{
				name: 'accountIds',
				label: 'Account IDs',
				type: 'list',
				required: true,
				description: 'Comma-separated fxapis account IDs, up to 200',
			},
		],
	},
	{
		...A,
		operation: 'cool',
		operationName: 'Take Offline',
		action: 'Take an account offline',
		description: "Stop the account's connection. Refused while an order is in flight.",
		method: 'POST',
		path: '/v1/accounts/:accountId/cool',
		params: [account],
	},
	{
		...A,
		operation: 'restart',
		operationName: 'Restart',
		action: 'Restart an account connection',
		description:
			'For an online account that misbehaves: degraded, stale quotes, a stuck sync. Poll its status until it is ready.',
		method: 'POST',
		path: '/v1/accounts/:accountId/restart',
		params: [account],
	},
	{
		...A,
		operation: 'reconcile',
		operationName: 'Reconcile',
		action: 'Confirm pending results with the broker',
		description:
			'Confirm every order still in unknown on this account and bring deals and positions up to date. Safe to call twice.',
		method: 'POST',
		path: '/v1/accounts/:accountId/reconcile',
		params: [account],
	},
	{
		...A,
		operation: 'setMode',
		operationName: 'Change Mode',
		action: 'Change account mode',
		description:
			'Change when the account stays connected. Takes effect the next time it comes online.',
		method: 'POST',
		path: '/v1/accounts/:accountId/mode',
		params: [account],
		body: [mode],
	},
	{
		...A,
		operation: 'updatePassword',
		operationName: 'Update Password',
		action: 'Update an account password',
		description:
			'Send a new trading password and server from an fxapis MT5 Login credential. The account is taken offline first.',
		method: 'POST',
		path: '/v1/accounts/:accountId/password',
		params: [account],
		mt5Login: ['password', 'server'],
	},
	{
		...A,
		operation: 'changeServer',
		operationName: 'Change Server',
		action: 'Move an account to another server',
		description:
			'For a login added under the wrong server name. The stored password is kept and tried on the new server.',
		method: 'POST',
		path: '/v1/accounts/:accountId/server',
		params: [account],
		body: [
			{
				name: 'server',
				label: 'Server',
				type: 'string',
				required: true,
				placeholder: 'e.g. ICMarketsSC-Demo',
				description: 'Exactly as MetaTrader shows it',
			},
			{
				name: 'connect',
				label: 'Connect',
				type: 'boolean',
				default: true,
				description:
					'Whether to bring the account online straight away. The API does this by default.',
			},
		],
	},
	{
		...A,
		operation: 'calculate',
		operationName: 'Calculate',
		action: 'Calculate margin or profit',
		description:
			'Margin an order needs, or profit at a price, from the broker. Opens nothing. The account must be online.',
		method: 'POST',
		path: '/v1/accounts/:accountId/calculate',
		params: [account],
		body: [
			{
				name: 'calculation',
				label: 'Calculate',
				type: 'options',
				required: true,
				sendAs: 'kind',
				default: 'margin',
				description: 'What to calculate',
				options: [
					{ name: 'Margin', value: 'margin' },
					{ name: 'Profit', value: 'profit' },
				],
			},
			{
				name: 'symbol',
				label: 'Symbol',
				type: 'string',
				required: true,
				placeholder: 'e.g. EURUSD',
				description: 'The broker symbol',
			},
			side,
			volume,
			{
				name: 'price',
				label: 'Price',
				type: 'string',
				required: true,
				description: 'The price the position opens at',
			},
			{
				name: 'closePrice',
				label: 'Close Price',
				type: 'string',
				description: 'Required for profit: the price the position closes at',
			},
		],
	},
	{
		...A,
		operation: 'disconnect',
		operationName: 'Disconnect',
		action: 'Disconnect an account',
		description: 'Erase the stored password. The history stays.',
		method: 'POST',
		path: '/v1/accounts/:accountId/disconnect',
		params: [account],
	},
	{
		...A,
		operation: 'delete',
		operationName: 'Delete',
		action: 'Delete an account',
		description:
			'Delete the account with its orders, deals and positions permanently. Disconnect instead to keep the history.',
		method: 'DELETE',
		path: '/v1/accounts/:accountId',
		params: [account],
		query: [
			{
				name: 'force',
				label: 'Force',
				type: 'boolean',
				default: true,
				description:
					'Whether to delete even with open positions. Those positions stay open at the broker.',
			},
		],
	},

	{
		...O,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many orders',
		description:
			'Orders in this workspace, newest first. Filter by state to find unknown outcomes.',
		method: 'GET',
		path: '/v1/orders',
		list: { cursor: true, max: 200 },
		query: [
			{ name: 'accountId', label: 'Account ID', type: 'string', description: 'Only this account' },
			{
				name: 'state',
				label: 'State',
				type: 'options',
				default: 'unknown',
				description: 'Only this state. Unknown means the broker result is still being confirmed.',
				options: ORDER_STATES.map((value) => ({ name: titled(value), value })),
			},
			{ name: 'symbol', label: 'Symbol', type: 'string', description: 'Only this broker symbol' },
			since,
			until,
		],
	},
	{
		...O,
		operation: 'get',
		operationName: 'Get',
		action: 'Get an order',
		description: 'Retrieve an order, including an unknown outcome',
		method: 'GET',
		path: '/v1/orders/:orderId',
		params: [order],
	},
	{
		...O,
		operation: 'market',
		operationName: 'Place Market Order',
		action: 'Place a market order',
		description: 'Send a market order and wait for the broker. Reuse the idempotency key on retry.',
		method: 'POST',
		path: '/v1/accounts/:accountId/orders/market',
		idempotent: true,
		params: [account],
		body: [
			naming,
			marketName,
			side,
			volume,
			stopLoss,
			takeProfit,
			deviation,
			comment,
			clientOrderId,
		],
	},
	{
		...O,
		operation: 'pending',
		operationName: 'Place Pending Order',
		action: 'Place a pending order',
		description: 'Place a limit, stop or stop-limit order. Reuse the idempotency key on retry.',
		method: 'POST',
		path: '/v1/accounts/:accountId/orders/pending',
		idempotent: true,
		params: [account],
		body: [
			naming,
			marketName,
			side,
			{
				name: 'kind',
				label: 'Kind',
				type: 'options',
				required: true,
				default: 'limit',
				description: 'A limit waits for a better price, a stop for a worse one',
				options: [
					{ name: 'Limit', value: 'limit' },
					{ name: 'Stop', value: 'stop' },
					{ name: 'Stop Limit', value: 'stop_limit' },
				],
			},
			volume,
			{
				name: 'price',
				label: 'Price',
				type: 'string',
				required: true,
				description: 'The price the order waits at',
			},
			{
				name: 'stopLimitPrice',
				label: 'Stop Limit Price',
				type: 'string',
				description: 'Required for a stop limit: the limit placed once the stop triggers',
			},
			stopLoss,
			takeProfit,
			expiresAt,
			comment,
			clientOrderId,
		],
	},
	{
		...O,
		operation: 'modify',
		operationName: 'Modify',
		action: 'Modify a pending order',
		description: "Move a working pending order's price, stops or expiry and keep its ticket",
		method: 'POST',
		path: '/v1/orders/:orderId/modify',
		params: [order],
		optional: 'updateFields',
		body: [
			{
				name: 'price',
				label: 'Price',
				type: 'string',
				description: 'The new price the order waits at',
			},
			{
				name: 'stopLimitPrice',
				label: 'Stop Limit Price',
				type: 'string',
				description: 'For a stop-limit order',
			},
			stopLoss,
			{
				name: 'removeStopLoss',
				label: 'Remove Stop Loss',
				type: 'boolean',
				default: true,
				clears: 'stopLoss',
				description: 'Whether to clear the stop loss',
			},
			takeProfit,
			{
				name: 'removeTakeProfit',
				label: 'Remove Take Profit',
				type: 'boolean',
				default: true,
				clears: 'takeProfit',
				description: 'Whether to clear the take profit',
			},
			expiresAt,
		],
	},
	{
		...O,
		operation: 'cancel',
		operationName: 'Cancel',
		action: 'Cancel a pending order',
		description: 'Cancel a pending order that has not filled',
		method: 'POST',
		path: '/v1/orders/:orderId/cancel',
		params: [order],
	},
	{
		...O,
		operation: 'deals',
		operationName: 'Get Deals',
		action: 'Get the deals of an order',
		description: 'The broker deals one order produced. A partial fill leaves more than one.',
		method: 'GET',
		path: '/v1/orders/:orderId/deals',
		params: [order],
	},

	{
		...P,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many positions',
		description: 'Open positions on an account',
		method: 'GET',
		path: '/v1/accounts/:accountId/positions',
		params: [account],
		list: {},
		query: [
			{
				name: 'includeClosed',
				label: 'Include Closed',
				type: 'boolean',
				default: true,
				description: 'Whether to also return positions seen closed, with closedAt set',
			},
		],
	},
	{
		...P,
		operation: 'close',
		operationName: 'Close',
		action: 'Close a position',
		description:
			'Close a position in whole, or in part with a volume. A retry with a new key can open the other side.',
		method: 'POST',
		path: '/v1/accounts/:accountId/positions/:positionId/close',
		idempotent: true,
		params: [account, position],
		body: [
			{
				name: 'volume',
				label: 'Volume',
				type: 'string',
				placeholder: 'e.g. 0.01',
				description: 'Lots to close. Leave out to close the whole position.',
			},
			deviation,
			comment,
			clientOrderId,
		],
	},
	{
		...P,
		operation: 'modify',
		operationName: 'Modify',
		action: 'Move a stop or target',
		description: 'Move or remove the stop loss or take profit. This opens nothing.',
		method: 'POST',
		path: '/v1/accounts/:accountId/positions/:positionId/modify',
		params: [account, position],
		optional: 'updateFields',
		body: [
			stopLoss,
			{
				name: 'removeStopLoss',
				label: 'Remove Stop Loss',
				type: 'boolean',
				default: true,
				clears: 'stopLoss',
				description: 'Whether to clear the stop loss',
			},
			takeProfit,
			{
				name: 'removeTakeProfit',
				label: 'Remove Take Profit',
				type: 'boolean',
				default: true,
				clears: 'takeProfit',
				description: 'Whether to clear the take profit',
			},
		],
	},

	{
		...D,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many deals',
		description: "An account's deal history from the broker, newest first",
		method: 'GET',
		path: '/v1/accounts/:accountId/deals',
		params: [account],
		list: { cursor: true, max: 200 },
		query: [
			{ name: 'symbol', label: 'Symbol', type: 'string', description: 'Only this broker symbol' },
			since,
			{
				name: 'until',
				label: 'Until',
				type: 'string',
				placeholder: 'e.g. 2026-11-02T00:00:00Z',
				description: 'ISO 8601 time, inclusive',
			},
		],
	},

	{
		...W,
		operation: 'create',
		operationName: 'Create',
		action: 'Place one order on many accounts',
		description: 'One market order on each listed account. Reuse the idempotency key on retry.',
		method: 'POST',
		path: '/v1/execution-waves',
		idempotent: true,
		body: [
			{
				name: 'accountIds',
				label: 'Account IDs',
				type: 'list',
				required: true,
				description: 'Comma-separated fxapis account IDs, up to 1,000',
			},
			naming,
			marketName,
			side,
			{ ...volume, description: 'Lots per account, unless a weight overrides it' },
			stopLoss,
			takeProfit,
			comment,
			{ name: 'label', label: 'Label', type: 'string', description: 'A name you will recognise' },
			{
				name: 'clientWaveId',
				label: 'Client Wave ID',
				type: 'string',
				description: 'Your own reference, echoed back',
			},
			barrierPolicy,
			waveExecuteAt,
			waveExpiresAt,
			{
				name: 'weights',
				label: 'Weights',
				type: 'json',
				default: '{}',
				description: 'Per-account volume keyed by account ID, e.g. {"<account ID>": "0.02"}',
			},
		],
	},
	{
		...W,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many multi-account orders',
		description: 'Multi-account orders in this workspace, newest first',
		method: 'GET',
		path: '/v1/execution-waves',
		list: {},
	},
	{
		...W,
		operation: 'get',
		operationName: 'Get',
		action: 'Get a multi-account order',
		description:
			'Retrieve a multi-account order with its per-account results: filled (fully or in part), rejected by the broker, skipped (never sent) or unresolved',
		method: 'GET',
		path: '/v1/execution-waves/:waveId',
		params: [wave],
	},
	{
		...W,
		operation: 'cancel',
		operationName: 'Cancel',
		action: 'Cancel a multi-account order',
		description: 'Cancel a multi-account order whose orders have not started going out',
		method: 'POST',
		path: '/v1/execution-waves/:waveId/cancel',
		params: [wave],
	},
	{
		...W,
		operation: 'close',
		operationName: 'Close Positions',
		action: 'Close the positions of a multi-account order',
		description:
			'Close the position each filled account opened, every account at once, with a result per account. Reuse the idempotency key on retry.',
		method: 'POST',
		path: '/v1/execution-waves/:waveId/close',
		params: [wave],
		idempotent: true,
		body: [
			{
				name: 'accountIds',
				label: 'Account IDs',
				type: 'list',
				description:
					'Comma-separated fxapis account IDs of this multi-account order, to close only those. Leave out to close every account.',
			},
		],
	},
	{
		...W,
		operation: 'retry',
		operationName: 'Retry',
		action: 'Retry the accounts a multi-account order did not reach',
		description:
			'Place a new multi-account order for the accounts that were skipped, linked by retryOf. Reuse the idempotency key on retry.',
		method: 'POST',
		path: '/v1/execution-waves/:waveId/retry',
		params: [wave],
		idempotent: true,
		body: [
			{
				name: 'include',
				label: 'Include',
				type: 'multiOptions',
				default: ['skipped'],
				description:
					'Which accounts of a settled multi-account order to retry, by result. A cancelled or abandoned one sent nothing, so every account is retried.',
				options: [
					{ name: 'Skipped', value: 'skipped', description: 'Never reached the broker' },
					{ name: 'Rejected', value: 'rejected', description: 'The broker refused the order' },
				],
			},
			{
				name: 'accountIds',
				label: 'Account IDs',
				type: 'list',
				description: 'Comma-separated fxapis account IDs: only these, of those Include selects',
			},
			{ ...barrierPolicy, description: "Leave out to use the original order's policy" },
			waveExecuteAt,
			waveExpiresAt,
		],
	},

	{
		...M,
		operation: 'quotes',
		operationName: 'Get Quotes',
		action: 'Get live quotes',
		description:
			"Bid and ask from the account's broker, up to 20 names. The account must be online.",
		method: 'GET',
		path: '/v1/accounts/:accountId/quotes',
		params: [account],
		query: [
			{
				name: 'quoteNaming',
				label: 'Name the Markets By',
				type: 'options',
				required: true,
				keyFor: 'quoteNames',
				default: 'symbols',
				description: 'Send broker symbols or fxapis instruments',
				options: [
					{ name: 'Broker Symbols', value: 'symbols' },
					{ name: 'Instruments', value: 'instruments' },
				],
			},
			{
				name: 'quoteNames',
				label: 'Symbols or Instruments',
				type: 'string',
				required: true,
				placeholder: 'e.g. EURUSD,XAUUSD',
				description: 'Comma-separated, as chosen above',
			},
		],
	},
	{
		...M,
		operation: 'candles',
		operationName: 'Get Price History',
		action: 'Get price history',
		description:
			"Candles from the account's broker, oldest first. The last one is still forming. The account must be online.",
		method: 'GET',
		path: '/v1/accounts/:accountId/candles',
		params: [account],
		query: [
			naming,
			marketName,
			{
				name: 'timeframe',
				label: 'Timeframe',
				type: 'options',
				required: true,
				default: 'H1',
				description: 'The bar size',
				options: ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'].map((value) => ({
					name: value,
					value,
				})),
			},
			{
				name: 'count',
				label: 'Count',
				type: 'number',
				min: 1,
				max: 1000,
				default: 100,
				description: 'How many bars, counting back from the current one',
			},
		],
	},
	{
		...M,
		operation: 'sessions',
		operationName: 'Get Market Hours',
		action: 'Get market hours',
		description:
			"Trading and quote sessions for a symbol from the account's broker, and whether it is open now",
		method: 'GET',
		path: '/v1/accounts/:accountId/sessions',
		params: [account],
		query: [naming, marketName],
	},
	{
		...M,
		operation: 'symbols',
		operationName: 'Get Many Symbols',
		action: 'Get many broker symbols',
		description: "The symbols the account's broker offers",
		method: 'GET',
		path: '/v1/accounts/:accountId/symbols',
		params: [account],
		list: { cursor: true, max: 1000 },
		query: [
			{
				name: 'search',
				label: 'Search',
				type: 'string',
				description: 'Only symbols whose name or description contains this',
			},
			{
				name: 'tradable',
				label: 'Tradable',
				type: 'options',
				default: 'true',
				description: 'Only symbols this account can, or cannot, open positions in',
				options: [
					{ name: 'Tradable', value: 'true' },
					{ name: 'Not Tradable', value: 'false' },
				],
			},
		],
	},
	{
		...M,
		operation: 'syncSymbols',
		operationName: 'Sync Symbols',
		action: 'Sync broker symbols',
		description:
			"Read the broker's symbol list again, for when the broker has added symbols. The account must be online.",
		method: 'POST',
		path: '/v1/accounts/:accountId/symbols/sync',
		params: [account],
	},
	{
		...M,
		operation: 'instruments',
		operationName: 'Get Instrument Mapping',
		action: 'Get instrument mapping',
		description:
			'For every instrument, the symbol an order naming it trades on this account, or why it cannot',
		method: 'GET',
		path: '/v1/accounts/:accountId/instruments',
		params: [account],
	},

	{
		...I,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many instruments',
		description: 'The markets an order can name as an instrument, such as EURUSD and XAUUSD',
		method: 'GET',
		path: '/v1/instruments',
		list: {},
		query: [
			{
				name: 'category',
				label: 'Category',
				type: 'options',
				default: 'forex',
				description: 'Only this category',
				options: ['forex', 'metals', 'indices', 'energies', 'crypto'].map((value) => ({
					name: titled(value),
					value,
				})),
			},
		],
	},

	{
		...B,
		operation: 'list',
		operationName: 'Search',
		action: 'Search broker servers',
		description: 'MT5 servers matching a broker or server name, for finding the exact server name',
		method: 'GET',
		path: '/v1/brokers/servers',
		list: { max: 50 },
		query: [
			{
				name: 'search',
				label: 'Search',
				type: 'string',
				required: true,
				sendAs: 'q',
				placeholder: 'e.g. vantage',
				description: 'A broker name or the start of a server name',
			},
		],
	},

	{
		...E,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many events',
		description:
			'Every event this workspace recorded, as webhooks deliver it. Use After to catch up oldest first.',
		method: 'GET',
		path: '/v1/events',
		list: { cursor: true, max: 200, after: 'after' },
		query: [
			{
				name: 'after',
				label: 'After Event ID',
				type: 'string',
				description:
					'Return events after this one, oldest first. Take it from the last event of a list you processed, never from a webhook.',
			},
			{
				name: 'since',
				label: 'Since',
				type: 'string',
				placeholder: 'e.g. 2026-11-01T00:00:00Z',
				description: 'ISO 8601 time, inclusive',
			},
			until,
			{
				name: 'types',
				label: 'Types',
				type: 'multiOptions',
				sendAs: 'type',
				options: eventOptions,
				default: [],
				description: 'Only these event types',
			},
			{
				name: 'accountId',
				label: 'Account ID',
				type: 'string',
				sendAs: 'account_id',
				description: 'Only events about this account',
			},
			{
				name: 'undelivered',
				label: 'Undelivered Only',
				type: 'boolean',
				sendAs: 'delivery_status',
				whenOn: 'failed',
				default: true,
				description: 'Whether to return only events one of your webhooks has not received',
			},
		],
	},
	{
		...E,
		operation: 'get',
		operationName: 'Get',
		action: 'Get an event',
		description: 'Retrieve one event',
		method: 'GET',
		path: '/v1/events/:eventId',
		params: [event],
	},

	{
		...H,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many webhooks',
		description: 'Webhook endpoints, newest first. Secrets are not returned.',
		method: 'GET',
		path: '/v1/webhooks',
		list: {},
	},
	{
		...H,
		operation: 'create',
		operationName: 'Create',
		action: 'Create a webhook',
		description: 'Register a public HTTPS URL on port 443. The signing secret is returned once.',
		method: 'POST',
		path: '/v1/webhooks',
		body: [
			{
				name: 'url',
				label: 'URL',
				type: 'string',
				required: true,
				placeholder: 'e.g. https://example.com/fxapis',
				description: 'HTTPS on port 443, a public host',
			},
			events,
			{
				name: 'description',
				label: 'Description',
				type: 'string',
				description: 'A note for yourself',
			},
		],
	},
	{
		...H,
		operation: 'get',
		operationName: 'Get',
		action: 'Get a webhook',
		description: 'Retrieve an endpoint, including its last delivery and why it was switched off',
		method: 'GET',
		path: '/v1/webhooks/:webhookId',
		params: [webhook],
	},
	{
		...H,
		operation: 'update',
		operationName: 'Update',
		action: 'Update a webhook',
		description: 'Change the URL, events or description. The secret stays the same.',
		method: 'PATCH',
		path: '/v1/webhooks/:webhookId',
		params: [webhook],
		optional: 'updateFields',
		body: [
			{
				name: 'url',
				label: 'URL',
				type: 'string',
				placeholder: 'e.g. https://example.com/fxapis',
				description: 'HTTPS on port 443, a public host',
			},
			events,
			{
				name: 'description',
				label: 'Description',
				type: 'string',
				description: 'A note for yourself',
			},
		],
	},
	{
		...H,
		operation: 'delete',
		operationName: 'Delete',
		action: 'Delete a webhook',
		description: 'Delete an endpoint permanently, including retries already waiting',
		method: 'DELETE',
		path: '/v1/webhooks/:webhookId',
		params: [webhook],
	},
	{
		...H,
		operation: 'enable',
		operationName: 'Enable',
		action: 'Enable a webhook',
		description:
			'Send events again from the next one. Missed events are sent only if you replay them.',
		method: 'POST',
		path: '/v1/webhooks/:webhookId/enable',
		params: [webhook],
	},
	{
		...H,
		operation: 'disable',
		operationName: 'Disable',
		action: 'Disable a webhook',
		description: 'Stop sending until it is enabled again. Waiting deliveries are kept.',
		method: 'POST',
		path: '/v1/webhooks/:webhookId/disable',
		params: [webhook],
	},
	{
		...H,
		operation: 'rotate',
		operationName: 'Rotate Secret',
		action: 'Rotate a webhook secret',
		description:
			'Issue a new secret, returned once. For 24 hours deliveries are signed with both secrets.',
		method: 'POST',
		path: '/v1/webhooks/:webhookId/rotate',
		params: [webhook],
	},
	{
		...H,
		operation: 'test',
		operationName: 'Send Test',
		action: 'Send a test event',
		description: 'Send webhook.test to this endpoint only. The delivery log has the result.',
		method: 'POST',
		path: '/v1/webhooks/:webhookId/test',
		params: [webhook],
	},
	{
		...H,
		operation: 'deliveries',
		operationName: 'Get Many Deliveries',
		action: 'Get many webhook deliveries',
		description: 'Delivery attempts to an endpoint, newest first, kept 30 days',
		method: 'GET',
		path: '/v1/webhooks/:webhookId/deliveries',
		params: [webhook],
		list: { cursor: true, max: 200 },
		query: [
			{
				name: 'status',
				label: 'Status',
				type: 'options',
				default: 'failed',
				description: 'Only this result',
				options: [
					{ name: 'Succeeded', value: 'succeeded' },
					{ name: 'Failed', value: 'failed' },
				],
			},
			{
				name: 'eventType',
				label: 'Event Type',
				type: 'options',
				default: 'order.filled',
				description: 'Only this event type',
				options: [...eventOptions, { name: 'webhook.test', value: 'webhook.test' }],
			},
		],
	},
	{
		...H,
		operation: 'getDelivery',
		operationName: 'Get Delivery',
		action: 'Get a webhook delivery',
		description: 'One delivery attempt, with the request sent and the start of the answer',
		method: 'GET',
		path: '/v1/webhooks/:webhookId/deliveries/:deliveryId',
		params: [webhook, delivery],
	},
	{
		...H,
		operation: 'redeliver',
		operationName: 'Redeliver',
		action: 'Redeliver an event',
		description: 'Queue one event to this endpoint again, with the same event ID',
		method: 'POST',
		path: '/v1/webhooks/:webhookId/deliveries/:eventId/redeliver',
		params: [webhook, event],
	},
	{
		...H,
		operation: 'replay',
		operationName: 'Replay',
		action: 'Replay events to a webhook',
		description:
			'Queue a window of events. By default only those this endpoint did not receive, so a repeat sends nothing twice.',
		method: 'POST',
		path: '/v1/webhooks/:webhookId/replay',
		params: [webhook],
		body: [
			{
				name: 'since',
				label: 'Since',
				type: 'string',
				required: true,
				placeholder: 'e.g. 2026-11-01T00:00:00Z',
				description: 'ISO 8601 time, inclusive. Pass a nextSince back exactly as given.',
			},
			{
				name: 'until',
				label: 'Until',
				type: 'string',
				placeholder: 'e.g. 2026-11-02T00:00:00Z',
				description: 'ISO 8601 time, exclusive. Defaults to now.',
			},
			{
				...events,
				name: 'types',
				label: 'Types',
				description: 'Only these types. None means every type this endpoint receives.',
			},
			{
				name: 'include',
				label: 'Include',
				type: 'options',
				default: 'failed',
				description: 'Which events to send',
				options: [
					{
						name: 'Not Received',
						value: 'failed',
						description: 'Only events this endpoint did not receive',
					},
					{ name: 'All', value: 'all', description: 'Every event in the window' },
				],
			},
		],
	},

	{
		...S,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many copy strategies',
		description: 'Copy-trading strategies in this workspace, newest first',
		method: 'GET',
		path: '/v1/copy/strategies',
		list: { cursor: true, max: 500 },
	},
	{
		...S,
		operation: 'create',
		operationName: 'Create',
		action: 'Create a copy strategy',
		description: `Make an always-on hedging account a strategy. ${COPY_PAUSED}`,
		method: 'POST',
		path: '/v1/copy/strategies',
		body: [
			account,
			{
				name: 'name',
				label: 'Name',
				type: 'string',
				required: true,
				description: 'The name followers see',
			},
		],
	},
	{
		...S,
		operation: 'get',
		operationName: 'Get',
		action: 'Get a copy strategy',
		description: 'Retrieve a strategy',
		method: 'GET',
		path: '/v1/copy/strategies/:strategyId',
		params: [strategy],
	},
	{
		...S,
		operation: 'update',
		operationName: 'Update',
		action: 'Update a copy strategy',
		description: 'Rename, pause or resume a strategy. A paused strategy is not copied.',
		method: 'PATCH',
		path: '/v1/copy/strategies/:strategyId',
		params: [strategy],
		optional: 'updateFields',
		body: [
			{ name: 'name', label: 'Name', type: 'string', description: 'A new name' },
			{
				name: 'status',
				label: 'Status',
				type: 'options',
				default: 'active',
				description: 'Active or paused',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Paused', value: 'paused' },
				],
			},
		],
	},
	{
		...S,
		operation: 'archive',
		operationName: 'Archive',
		action: 'Archive a copy strategy',
		description:
			'Archive a strategy no subscription copies. The account can become a strategy again.',
		method: 'DELETE',
		path: '/v1/copy/strategies/:strategyId',
		params: [strategy],
	},

	{
		...U,
		operation: 'list',
		operationName: 'Get Many',
		action: 'Get many copy subscriptions',
		description: 'Followers, newest first, with status, settings and the last execution',
		method: 'GET',
		path: '/v1/copy/subscriptions',
		list: { cursor: true, max: 500 },
		query: [
			{
				name: 'strategyId',
				label: 'Strategy ID',
				type: 'string',
				description: 'Only this strategy',
			},
			{
				name: 'followerAccountId',
				label: 'Follower Account ID',
				type: 'string',
				description: 'Only this follower account',
			},
		],
	},
	{
		...U,
		operation: 'create',
		operationName: 'Create',
		action: 'Create a copy subscription',
		description: `Subscribe a follower account to a strategy. ${COPY_PAUSED}`,
		method: 'POST',
		path: '/v1/copy/subscriptions',
		body: [
			{ ...strategy, description: 'The strategy to follow' },
			{
				...account,
				name: 'followerAccountId',
				label: 'Follower Account',
				description: 'The account that copies',
			},
			{
				name: 'status',
				label: 'Status',
				type: 'options',
				default: 'active',
				description: 'Start active or paused',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Paused', value: 'paused' },
				],
			},
			{
				name: 'settings',
				label: 'Settings',
				type: 'json',
				default: '{}',
				description:
					'Sizing, symbols, limits and risk, as the API documents them. Every field has a default.',
			},
		],
	},
	{
		...U,
		operation: 'get',
		operationName: 'Get',
		action: 'Get a copy subscription',
		description: 'Retrieve a subscription',
		method: 'GET',
		path: '/v1/copy/subscriptions/:subscriptionId',
		params: [subscription],
	},
	{
		...U,
		operation: 'update',
		operationName: 'Update',
		action: 'Update a copy subscription',
		description: 'Change settings or status. Settings merge into what is there; lists replace.',
		method: 'PATCH',
		path: '/v1/copy/subscriptions/:subscriptionId',
		params: [subscription],
		optional: 'updateFields',
		body: [
			{
				name: 'status',
				label: 'Status',
				type: 'options',
				default: 'active',
				description: 'Active, paused, or close only',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Paused', value: 'paused' },
					{ name: 'Close Only', value: 'close_only' },
				],
			},
			{
				name: 'settings',
				label: 'Settings',
				type: 'json',
				default: '{}',
				description: 'Only what changes, as the API documents it',
			},
		],
	},
	{
		...U,
		operation: 'delete',
		operationName: 'Delete',
		action: 'Delete a copy subscription',
		description:
			"Delete a subscription, and close its positions or leave them open as the account's own",
		method: 'DELETE',
		path: '/v1/copy/subscriptions/:subscriptionId',
		params: [subscription],
		query: [
			{
				name: 'closePositions',
				label: 'Close Positions',
				type: 'boolean',
				required: true,
				default: false,
				description:
					"Whether to close the positions this subscription holds. Off leaves them open as the account's own.",
			},
		],
	},
	{
		...U,
		operation: 'reset',
		operationName: 'Reset',
		action: 'Reset a stopped copy subscription',
		description: `Bring a subscription a risk limit stopped back to active or paused. ${COPY_PAUSED}`,
		method: 'POST',
		path: '/v1/copy/subscriptions/:subscriptionId/reset',
		params: [subscription],
	},
	{
		...U,
		operation: 'links',
		operationName: 'Get Many Links',
		action: 'Get many copy links',
		description: 'Which follower position copies which master position',
		method: 'GET',
		path: '/v1/copy/subscriptions/:subscriptionId/links',
		params: [subscription],
		list: {},
		query: [
			{
				name: 'state',
				label: 'State',
				type: 'options',
				default: 'all',
				description: 'Open links, or also those closed in the last 30 days',
				options: [
					{ name: 'Open', value: 'open' },
					{ name: 'All', value: 'all' },
				],
			},
		],
	},

	{
		...C,
		operation: 'status',
		operationName: 'Get Status',
		action: 'Get copy trading status',
		description:
			'Whether copy trading is paused. While paused, nothing that starts copying is accepted.',
		method: 'GET',
		path: '/v1/copy/status',
	},
	{
		...C,
		operation: 'executions',
		operationName: 'Get Many Executions',
		action: 'Get many copy executions',
		description: 'What each master change did on each follower, newest first',
		method: 'GET',
		path: '/v1/copy/executions',
		list: { cursor: true, max: 200 },
		query: [
			{
				name: 'strategyId',
				label: 'Strategy ID',
				type: 'string',
				description: 'Only this strategy',
			},
			{
				name: 'subscriptionId',
				label: 'Subscription ID',
				type: 'string',
				description: 'Only this subscription',
			},
			{
				name: 'followerAccountId',
				label: 'Follower Account ID',
				type: 'string',
				description: 'Only this follower account',
			},
			{
				name: 'status',
				label: 'Status',
				type: 'options',
				default: 'failed',
				description: 'Only this result',
				options: ['executed', 'skipped', 'failed', 'pending'].map((value) => ({
					name: titled(value),
					value,
				})),
			},
			{
				name: 'reason',
				label: 'Reason',
				type: 'string',
				placeholder: 'e.g. price_moved',
				description: 'Only this skip or failure reason',
			},
			{
				name: 'since',
				label: 'Since',
				type: 'string',
				placeholder: 'e.g. 2026-11-01T00:00:00Z',
				description: 'ISO 8601 time, inclusive',
			},
		],
	},

	{
		...L,
		operation: 'usage',
		operationName: 'Get Usage',
		action: 'Get this month usage',
		description: "This month's usage and what it would cost. Closing is never refused for billing.",
		method: 'GET',
		path: '/v1/billing/usage',
	},
	{
		...L,
		operation: 'daily',
		operationName: 'Get Daily Usage',
		action: 'Get usage by day',
		description: 'Usage by day, for a chart or for checking an invoice line',
		method: 'GET',
		path: '/v1/billing/usage/daily',
	},
	{
		...L,
		operation: 'subscription',
		operationName: 'Get Subscription',
		action: 'Get the billing subscription',
		description: 'The plan being paid for, or null when nothing is',
		method: 'GET',
		path: '/v1/billing/subscription',
	},
	{
		...L,
		operation: 'plans',
		operationName: 'Get Plans',
		action: 'Get plans',
		description: 'The plans and what each includes',
		method: 'GET',
		path: '/v1/plans',
	},
	{
		...L,
		operation: 'invoices',
		operationName: 'Get Many Invoices',
		action: 'Get many invoices',
		description: 'Invoices, newest first. Amounts are in minor units.',
		method: 'GET',
		path: '/v1/billing/invoices',
		list: {},
	},
	{
		...L,
		operation: 'invoice',
		operationName: 'Get Invoice',
		action: 'Get an invoice',
		description: 'One invoice, with its lines, payment status and refunds',
		method: 'GET',
		path: '/v1/billing/invoices/:invoiceId',
		params: [invoice],
	},
	{
		...L,
		operation: 'coins',
		operationName: 'Get Coins',
		action: 'Get crypto coins',
		description: 'Coins accepted for crypto payment, each with the network to send it on',
		method: 'GET',
		path: '/v1/billing/crypto/coins',
	},

	{
		...K,
		operation: 'get',
		operationName: 'Get',
		action: 'Get the workspace',
		description: 'The workspace name, plan, and whether trading is switched off',
		method: 'GET',
		path: '/v1/workspace',
	},
];

export function operationFor(resource: string, operation: string): Operation | undefined {
	return OPERATIONS.find((item) => item.resource === resource && item.operation === operation);
}

export function resources(): Array<{ name: string; value: string }> {
	const seen = new Map<string, string>();
	for (const item of OPERATIONS) seen.set(item.resource, item.resourceName);
	return [...seen.entries()].map(([value, name]) => ({ name, value }));
}

/** The parameter collection an operation's optional fields live in. */
export function collectionFor(operation: Operation, target: 'body' | 'query'): string {
	if (target === 'body') return operation.optional ?? 'additionalFields';
	return operation.list ? 'filters' : 'options';
}
