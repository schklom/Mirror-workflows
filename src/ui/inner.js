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
parent.setHandler('highlight', path => highlightXpath(path));
parent.setHandler('selectionToggle', selectionToggle);

let selectionEnabled = false;
let selectionColor = '#000';

function selectionToggle(data) {
	console.log('selectionToggle', data);
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
	console.log('message.inner', msg.data);
	parent.handleRequest(JSON.parse(msg.data))
}, false);


function highlightXpath(xpath, reset) {
	let n = highlightOne(xpath, 0, reset);
	if (!reset) setTimeout(() => highlightXpath(xpath, true), 2000);
	return Promise.resolve(n);
}

function highlightOne(xpath, offset, reset) {
	let res = document.evaluate(xpath, document);
	let elem;
	let n = 0;
	while (elem = res.iterateNext()) {
		n += 1;
		if (n < offset) continue;
		else break;
	}
	if (elem && elem.style) {
		elem.style.background = reset ? 'inherit' : selectionColor;
		return highlightOne(xpath, offset+1, reset);
	} else {
		return offset;
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
