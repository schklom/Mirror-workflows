import RRM from './service/rrm';

const parent = new RRM({
	out(msg: any) {
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

function selectionToggle(data: { enabled: boolean, color?: string }) {
	console.debug('selectionToggle', data);
	selectionEnabled = data.enabled;
	if (data.color) selectionColor = data.color;
}

document.addEventListener('mouseover', e => {
	if (!selectionEnabled || e.target === document || !(e.target instanceof HTMLElement)) return;
	e.target.style.outline = '1px solid '+selectionColor;
});
document.addEventListener('mouseout', e => {
	if (e.target === document || !(e.target instanceof HTMLElement)) return;
	e.target.style.outline = '';
});

document.addEventListener('click', e => {
	e.preventDefault();
	e.stopImmediatePropagation();
	e.stopPropagation();
	const path = getXpath(e.target as HTMLElement);
	parent.createEvent('selected', path);
}, false);

window.addEventListener('message', (msg) => {
	console.debug('message.inner', msg.data);
	parent.handleRequest(JSON.parse(msg.data))
}, false);

function countLinks({ entry, link }: { entry: string, link: string }) {
	let res = document.evaluate(entry, document);
	let set = new Set();
	let elem;
	while (elem = res.iterateNext()) {
		let linkRes = document.evaluate(link, elem);
		let one = linkRes.iterateNext();
		if (!one || !('value' in one)) continue;
		set.add(one.value);
	}
	return Promise.resolve(set.size);
}

function highlightXpath(xpath: string) {
	let list = getList(xpath);
	highlightList(list, true);
	setTimeout(() => highlightList(list, false), 2000);
	return Promise.resolve(list.length);
}

function getList(xpath: string) {
	let res = document.evaluate(xpath, document);
	let list: Node[] = [];
	let elem;
	while (elem = res.iterateNext()) {
		list.push(elem);
	}
	return list;
}

function highlightList(list: Node[], activate: boolean) {
	for (let elem of list) {
		if (elem && elem instanceof HTMLElement) {
			elem.style.background = !activate ? 'inherit' : selectionColor;
		}
	}
}

function getXpath(element: HTMLElement|ParentNode): string {
	// if (element.id !== '')
	// 	return 'id("'+element.id+'")';
	if (element === document.body)
		return '/html/body';

	let ix = 0;
	let siblings = element.parentNode!.childNodes;
	for (let i = 0; i < siblings.length; i++) {
		let sibling = siblings[i];
		if (sibling === element) {
			return getXpath(element.parentNode!)+'/'+element.tagName.toLowerCase()+'['+(ix+1)+']';
		}
		if (sibling.nodeType === 1 && 'tagName' in sibling && 'tagName' in element && sibling.tagName === element.tagName) {
			ix += 1;
		}
	}
	return ''
}

console.log('FeedroPolis injection loaded');
