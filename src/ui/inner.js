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
parent.setHandler('getCount', getCount);
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
	// console.log('enter', e.target);
	e.target.style.outline = '1px solid '+selectionColor;
});
document.addEventListener('mouseout', e => {
	if (e.target === document) return;
	// if (!overElement) return;
	// console.log('leave', e.target);
	e.target.style.outline = '';
});

document.addEventListener('click', e => {
	e.preventDefault();
	e.stopImmediatePropagation();
	e.stopPropagation();
	const path = getPathTo(e.target);
	parent.createEvent('selected', path);
}, false);

window.addEventListener('message', (msg) => {
	console.log('message.inner', msg.data);
	parent.handleRequest(JSON.parse(msg.data))
}, false);

async function getCount(xpath) {
	let res = document.evaluate(xpath, document);
	let n = 0;
	while (res.iterateNext()) {
		n += 1;
	}
	return n;
}
function highlightXpath(xpath, reset) {
	let res = document.evaluate(xpath, document);
	let elem;
	let n = 0;
	while (elem = res.iterateNext()) {
		elem.style.background = reset ? 'inherit' : selectionColor;
		n += 1;
	}
	if (!reset) setTimeout(() => highlightXpath(xpath, true), 2000);
	return Promise.resolve(n);
}

function getPathTo(element) {
	// if (element.id !== '')
	// 	return 'id("'+element.id+'")';
	if (element === document.body)
		return '/HTML/'+element.tagName;

	let ix = 0;
	let siblings = element.parentNode.childNodes;
	for (let i = 0; i < siblings.length; i++) {
		let sibling = siblings[i];
		if (sibling === element)
			return getPathTo(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
		if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
			ix += 1;
	}
}

console.log('angrypol injection loaded');
