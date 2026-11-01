export type Field = {
	name: string;
	label: string;
	type: 'string' | 'number' | 'boolean' | 'options';
	required?: boolean;
	password?: boolean;
	typeOptions?: { password: true };
	description: string;
	default?: string | number | boolean;
	options?: Array<{ name: string; value: string }>;
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
	body?: Field[];
	query?: Field[];
	jsonBody?: boolean;
};

const account = { name: 'accountId', label: 'Account ID', type: 'string' as const, required: true, description: 'The fxapis account id, not the MT5 login.' };
const side = { name: 'side', label: 'Side', type: 'options' as const, required: true, description: 'Buy or sell.', options: [{ name: 'Buy', value: 'buy' }, { name: 'Sell', value: 'sell' }], default: 'buy' };
const volume = { name: 'volume', label: 'Volume', type: 'string' as const, required: true, description: 'Lots as a string, for example 0.01. Do not send a JSON number.' };
const naming = { name: 'naming', label: 'Name the Market By', type: 'options' as const, required: true, description: 'Send the broker symbol or an fxapis instrument, not both.', options: [{ name: 'Broker Symbol', value: 'symbol' }, { name: 'Instrument', value: 'instrument' }], default: 'symbol' };
const marketName = { name: 'marketName', label: 'Symbol or Instrument', type: 'string' as const, required: true, description: 'EURUSD if you chose broker symbol. XAUUSD if you chose instrument.' };

export const OPERATIONS: Operation[] = [
	{ resource: 'account', resourceName: 'Account', operation: 'list', operationName: 'List', action: 'List accounts', description: 'List the MT5 accounts in the workspace.', method: 'GET', path: '/v1/accounts' },
	{ resource: 'account', resourceName: 'Account', operation: 'get', operationName: 'Get', action: 'Get an account', description: 'Read one account, including its last figures.', method: 'GET', path: '/v1/accounts/:accountId', body: [account] },
	{
		resource: 'account', resourceName: 'Account', operation: 'connect', operationName: 'Connect', action: 'Connect an MT5 account', description: 'Connect an existing MT5 account. The trading password is sent once and is not returned.', method: 'POST', path: '/v1/accounts',
		body: [
			{ name: 'login', label: 'Login', type: 'string', required: true, description: 'The MT5 account number.' },
			{ name: 'server', label: 'Server', type: 'string', required: true, description: 'The server name exactly as MetaTrader shows it.' },
			{ name: 'password', label: 'Trading Password', type: 'string', required: true, password: true, typeOptions: { password: true }, description: 'The trading password, not the investor password. It is not written to the n8n log.' },
			{ name: 'mode', label: 'Mode', type: 'options', required: true, description: 'When the terminal stays online.', default: 'warm_on_demand', options: [{ name: 'On Demand', value: 'warm_on_demand' }, { name: 'Always On', value: 'always_on' }] },
			{ name: 'label', label: 'Label', type: 'string', description: 'A name you will recognise. Optional.' },
		],
	},
	{ resource: 'account', resourceName: 'Account', operation: 'status', operationName: 'Get Status', action: 'Get account status', description: 'Poll until state is ready before sending an order.', method: 'GET', path: '/v1/accounts/:accountId/status', body: [account] },
	{ resource: 'account', resourceName: 'Account', operation: 'figures', operationName: 'Get Figures', action: 'Get balance and margin', description: 'Balance, equity and margin. Fresh asks the terminal now and needs the account ready.', method: 'GET', path: '/v1/accounts/:accountId/figures', body: [account], query: [{ name: 'fresh', label: 'Fresh', type: 'boolean', description: 'Ask the terminal now instead of using the last snapshot.', default: false }] },
	{ resource: 'account', resourceName: 'Account', operation: 'quotes', operationName: 'Get Quotes', action: 'Get live quotes', description: 'Bid and ask from this account broker, up to 20 names. Not a stream.', method: 'GET', path: '/v1/accounts/:accountId/quotes', body: [account], query: [{ name: 'symbols', label: 'Symbols', type: 'string', description: 'Comma-separated broker symbols.' }, { name: 'instruments', label: 'Instruments', type: 'string', description: 'Comma-separated fxapis instruments.' }] },
	{ resource: 'account', resourceName: 'Account', operation: 'warm', operationName: 'Bring Online', action: 'Bring an account online', description: 'Returns at once. Poll status until ready.', method: 'POST', path: '/v1/accounts/:accountId/warm', body: [account] },
	{ resource: 'account', resourceName: 'Account', operation: 'cool', operationName: 'Take Offline', action: 'Take an account offline', description: 'Stop the terminal for this account.', method: 'POST', path: '/v1/accounts/:accountId/cool', body: [account] },
	{ resource: 'account', resourceName: 'Account', operation: 'disconnect', operationName: 'Disconnect', action: 'Disconnect an account', description: 'Erase the stored password. History stays.', method: 'POST', path: '/v1/accounts/:accountId/disconnect', body: [account] },
	{ resource: 'order', resourceName: 'Order', operation: 'market', operationName: 'Place Market Order', action: 'Place a market order', description: 'Sends a market order and waits for the broker. Requires an idempotency key you reuse on retry.', method: 'POST', path: '/v1/accounts/:accountId/orders/market', idempotent: true, body: [account, naming, marketName, side, volume, { name: 'stopLoss', label: 'Stop Loss', type: 'string', description: 'Absolute price, not a distance.' }, { name: 'takeProfit', label: 'Take Profit', type: 'string', description: 'Absolute price, not a distance.' }, { name: 'deviationPoints', label: 'Deviation Points', type: 'number', description: 'Maximum slippage in points.' }, { name: 'comment', label: 'Comment', type: 'string', description: 'Stored on the MT5 order, cut to fit.' }, { name: 'clientOrderId', label: 'Client Order ID', type: 'string', description: 'Your reference. Not required to be unique.' }] },
	{ resource: 'order', resourceName: 'Order', operation: 'pending', operationName: 'Place Pending Order', action: 'Place a pending order', description: 'Limit, stop, or stop-limit. Requires an idempotency key you reuse on retry.', method: 'POST', path: '/v1/accounts/:accountId/orders/pending', idempotent: true, body: [account, naming, marketName, side, { name: 'kind', label: 'Kind', type: 'options', required: true, description: 'Limit, stop, or stop-limit.', default: 'limit', options: [{ name: 'Limit', value: 'limit' }, { name: 'Stop', value: 'stop' }, { name: 'Stop Limit', value: 'stop_limit' }] }, volume, { name: 'price', label: 'Price', type: 'string', required: true, description: 'The pending price, as a string.' }, { name: 'stopLimitPrice', label: 'Stop Limit Price', type: 'string', description: 'Required by the broker for a stop-limit.' }] },
	{ resource: 'order', resourceName: 'Order', operation: 'get', operationName: 'Get', action: 'Get an order', description: 'Read one order, including unknown outcomes.', method: 'GET', path: '/v1/orders/:orderId', body: [{ name: 'orderId', label: 'Order ID', type: 'string', required: true, description: 'The fxapis order id.' }] },
	{ resource: 'order', resourceName: 'Order', operation: 'cancel', operationName: 'Cancel', action: 'Cancel a pending order', description: 'Cancel a pending order that has not filled.', method: 'POST', path: '/v1/orders/:orderId/cancel', body: [{ name: 'orderId', label: 'Order ID', type: 'string', required: true, description: 'The fxapis order id.' }] },
	{ resource: 'position', resourceName: 'Position', operation: 'list', operationName: 'List', action: 'List positions', description: 'Open positions on one account.', method: 'GET', path: '/v1/accounts/:accountId/positions', body: [account] },
	{ resource: 'position', resourceName: 'Position', operation: 'close', operationName: 'Close', action: 'Close a position', description: 'Close a position in whole, or partly if you send a volume. A retried close without the same key can open the other side.', method: 'POST', path: '/v1/accounts/:accountId/positions/:positionId/close', idempotent: true, body: [account, { name: 'positionId', label: 'Position Ticket', type: 'string', required: true, description: 'The broker position ticket.' }, { name: 'volume', label: 'Volume', type: 'string', description: 'Lots to close. Leave empty to close the whole position.' }] },
	{ resource: 'position', resourceName: 'Position', operation: 'modify', operationName: 'Modify', action: 'Move a stop or target', description: 'Move stop-loss or take-profit. This does not open exposure.', method: 'POST', path: '/v1/accounts/:accountId/positions/:positionId/modify', body: [account, { name: 'positionId', label: 'Position Ticket', type: 'string', required: true, description: 'The broker position ticket.' }, { name: 'stopLoss', label: 'Stop Loss', type: 'string', description: 'Absolute price. Send an empty string to leave it unchanged only if you also send a take profit.' }, { name: 'takeProfit', label: 'Take Profit', type: 'string', description: 'Absolute price.' }] },
	{ resource: 'wave', resourceName: 'Multi-Account Order', operation: 'create', operationName: 'Create', action: 'Place one order on many accounts', description: 'One trade across many accounts. The body is the API wave object. Requires an idempotency key.', method: 'POST', path: '/v1/execution-waves', idempotent: true, jsonBody: true },
	{ resource: 'wave', resourceName: 'Multi-Account Order', operation: 'get', operationName: 'Get', action: 'Get a multi-account order', description: 'Read one wave and its per-account results.', method: 'GET', path: '/v1/execution-waves/:waveId', body: [{ name: 'waveId', label: 'Wave ID', type: 'string', required: true, description: 'The fxapis wave id.' }] },
	{ resource: 'wave', resourceName: 'Multi-Account Order', operation: 'cancel', operationName: 'Cancel', action: 'Cancel a multi-account order', description: 'Cancel a wave that has not finished.', method: 'POST', path: '/v1/execution-waves/:waveId/cancel', body: [{ name: 'waveId', label: 'Wave ID', type: 'string', required: true, description: 'The fxapis wave id.' }] },
	{ resource: 'instrument', resourceName: 'Instrument', operation: 'list', operationName: 'List', action: 'List instruments', description: 'The markets fxapis can name, such as EURUSD and XAUUSD.', method: 'GET', path: '/v1/instruments' },
];

export function operationFor(resource: string, operation: string): Operation | undefined {
	return OPERATIONS.find((item) => item.resource === resource && item.operation === operation);
}

export function resources(): Array<{ name: string; value: string }> {
	const seen = new Map<string, string>();
	for (const item of OPERATIONS) seen.set(item.resource, item.resourceName);
	return [...seen.entries()].map(([value, name]) => ({ name, value }));
}
