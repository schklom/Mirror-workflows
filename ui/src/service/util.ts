import RRM from './rrm'
import EventEmitter from 'eventemitter3';
import { getKey } from './local-key';

export const EventHub = new EventEmitter();

const inner = new RRM({
	out(msg: any) {
		const frame = document.getElementById('iframe') as HTMLIFrameElement;
		if (!frame) return;
		frame.contentWindow!.postMessage(
			JSON.stringify(msg),
			document.location.origin
		);
	},
	initStatus: RRM.S_OPEN
})
inner.setHandler('selected', (data: any) => {
	EventHub.emit('selected', data);
})

window.addEventListener('message', (msg) => {
	console.debug('message.outer', msg.data);
	if (typeof msg.data !== 'string') return;
	try {
		let action = JSON.parse(msg.data)
		inner.handleRequest(action)
	} catch (e) {
		console.debug(e);
	}
}, false);

export async function ajax(action: string, data?: any, post?: boolean) {
	if (action[0] === '/') action = action.substring(1);
	let url = `${document.location.origin}/${action}`;
	let method = data ? 'POST' : 'GET';
	let key = await getKey();
	if (key) {
		url += `?mgmtKey=${key}`;
	}
	let body: any = undefined;
	if (data) {
		body = JSON.stringify(data);
	}
	try {
		const response = await fetch(url, {
			method,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body
		});
		const data_1 = await response.json();
		if (data_1.error) {
			let e = new Error('backend error');
			Object.defineProperty(e, 'data', {value: data_1})
			throw e;
		}
		return data_1.data;
	} catch (e_1) {
		EventHub.emit('requestError', e_1);
		throw e_1;
	}
}

export function send(action: string, data: any) {
	return inner.createRequest(action, data);
}
export function sendEvent(evt: string, data: any) {
	inner.createEvent(evt, data);
}
