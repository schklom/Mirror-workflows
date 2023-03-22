const RRM = require('./rrm');

const parent = new RRM({
	out(msg) {
		window.parent.postMessage(
			JSON.stringify(msg),
			document.location.origin
		);
	},
	initStatus: RRM.S_OPEN,
	timeout: 400
});
parent.setHandler('highlight', highlightXpath);
parent.setHandler('selectionToggle', selectionToggle);
parent.setHandler('countLinks', countLinks);

let selectionEnabled = false;
let selectionColor = '#000';

function selectionToggle(data) {
	console.debug('selectionToggle', data);
	selectionEnabled = data.enabled;
	if (data.color) selectionColor = data.color;
}

document.addEventListener('mouseover', e => {
	if (!selectionEnabled || e.target === document) return;
	e.target.style.outline = '1px solid '+selectionColor;
});
document.addEventListener('mouseout', e => {
	if (e.target === document) return;
	e.target.style.outline = '';
});

document.addEventListener('click', e => {
	e.preventDefault();
	e.stopImmediatePropagation();
	e.stopPropagation();
	const path = getXpath(e.target);
	parent.createEvent('selected', path);
}, false);

window.addEventListener('message', (msg) => {
	console.debug('message.inner', msg.data);
	parent.handleRequest(JSON.parse(msg.data))
}, false);

function countLinks({ entry, link }) {
	let res = document.evaluate(entry, document);
	let set = new Set();
	let elem;
	while (elem = res.iterateNext()) {
		let linkRes = document.evaluate(link, elem);
		let one = linkRes.iterateNext();
		if (!one || !one.value) continue;
		set.add(one.value);
	}
	return Promise.resolve(set.size);
}

function highlightXpath(xpath) {
	let list = getList(xpath);
	highlightList(list, true);
	setTimeout(() => highlightList(list, false), 2000);
	return Promise.resolve(list.length);
}

function getList(xpath) {
	let res = document.evaluate(xpath, document);
	let list = [];
	let elem;
	while (elem = res.iterateNext()) {
		list.push(elem);
	}
	return list;
}

function highlightList(list, activate) {
	for (let elem of list) {
		if (elem && elem.style) {
			elem.style.background = !activate ? 'inherit' : selectionColor;
		}
	}
}

function getXpath(element) {
	// if (element.id !== '')
	// 	return 'id("'+element.id+'")';
	if (element === document.body)
		return '/html/body';

	let ix = 0;
	let siblings = element.parentNode.childNodes;
	for (let i = 0; i < siblings.length; i++) {
		let sibling = siblings[i];
		if (sibling === element)
			return getXpath(element.parentNode)+'/'+element.tagName.toLowerCase()+'['+(ix+1)+']';
		if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
			ix += 1;
	}
}

console.log('FeedroPolis injection loaded');
