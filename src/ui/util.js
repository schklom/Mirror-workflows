const RRM = require('./rrm');
import Vue from 'vue';

export const EventHub = new Vue();

const inner = new RRM({
	out(msg) {
		document.getElementById('iframe').contentWindow.postMessage(
			JSON.stringify(msg),
			document.location.origin
		);
	}
})
inner.setHandler('selected', (data) => {
	EventHub.$emit('selected', data);
})

window.addEventListener('message', (msg) => {
	console.log('message.outer', msg.data);
	if (typeof msg.data !== 'string') return;
	try {
		let action = JSON.parse(msg.data)
		inner.handleRequest(action)
	} catch (e) {
		console.debug(e);
	}
}, false);

export function ajax(action, data, post) {
	if (action[0] === '/') action = action.substr(1);
	let url = `${document.location.origin}/${action}`;
	let method = data ? 'POST' : 'GET';
	let body = undefined;
	if (data) {
		body = JSON.stringify(data);
	}
	return fetch(url, {
		method,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body
	}).then((response) => response.json())
	.then(data => {
		if (data.error) {
			let e = new Error('backend error');
			e.data = data;
			throw e;
		}
		return data;
	}).catch(e => {
		EventHub.$emit('requestError', e);
		throw e;
	});
}

export function send(action, data) {
	return inner.createRequest(action, data);
}
export function sendEvent(evt, data) {
	inner.createEvent(evt, data);
}
