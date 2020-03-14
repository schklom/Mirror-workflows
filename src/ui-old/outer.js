import '../../node_modules/purecss/build/pure-min.css';
import './assets/custom.scss';

const iframe = document.getElementById('iframe');
const input1 = document.getElementById('xpath1');
const input2 = document.getElementById('xpath2');
const input3 = document.getElementById('xpath3');
const input4 = document.getElementById('found3');
const button1 = document.getElementsByClassName('select1');
const button2 = document.getElementsByClassName('select2');
const loadForm = document.getElementById('loadForm');

let selectionTarget = null;

function highlightSelectionTarget(status) {
	selectionTarget.style.background = status ? 'blue' : 'inherit';
}
input1.addEventListener('blur', e => {
	highlightXpath(input1.value);
})
for (let button of button1) {
	button.addEventListener('click', e => {
		e.preventDefault();
		selectionTarget = input1;
		highlightSelectionTarget(true)
	})
}
input2.addEventListener('blur', e => {
	highlightXpath(input2.value);
})
for (let button of button2) {
	button.addEventListener('click', e => {
		e.preventDefault();
		selectionTarget = input2;
		highlightSelectionTarget(true)
	})
}
input3.addEventListener('blur', e => {
	highlightXpath(input3.value);
	updateFound();
})
function updateFound() {
	send('getCount', input3.value);
}
function updateCount(data) {
	input4.value = data;
}
function updateEntry() {
	let path1 = input1.value;
	let path2 = input2.value;
	let path3 = '';
	for (let i=0, ii=path1.length; i<ii; i++) {
		if (path1[i] === path2[i]) {
			path3 = path3 + path1[i];
		} else {
			break;
		}
	}
	path3 = path3.replace(/\/$/, '');
	input3.value = path3;
	updateFound();
}
function handleSelection(path) {
	if (!selectionTarget) return;
	let xpath = stripNumbers(path);
	selectionTarget.value = xpath;
	highlightXpath(xpath);
	highlightSelectionTarget(false)
	updateEntry();
	// selectionTarget = null;
}

window.addEventListener('message', (msg) => {
	let { action, data } = JSON.parse(msg.data);
	console.log('message', action, data);
	switch (action) {
		case 'selected': {
			handleSelection(data);
			break;
		}
		case 'updateCount': {
			updateCount(data);
			break;
		}
	}
}, false);

function highlightXpath(xpath) {
	send('highlight', xpath);
}

function send(action, data) {
	iframe.contentWindow.postMessage(JSON.stringify({ action, data }), document.location.origin);
}

function stripNumbers(xpath) {
	let p = xpath.split('/');
	p = p.map(node => {
		return node.replace(/\[[0-9]+\]$/, '');
	})
	return p.join('/');
}

loadForm.addEventListener('submit', e => {
	e.preventDefault();
	let data = new FormData(e.target);
	console.log(data);
	ajax('api/main/load-page', data)
	.then(res => {
		if (res.error) {
			return;
		}
		console.log(res);
		const iframe = document.getElementById('iframe');
		iframe.contentWindow.location.reload();
		iframe.parentElement.parentElement.firstElementChild.checked = true;
	});
});

function ajax(action, data) {
	if (action[0] === '/') action = action.substr(1);
	let url = `${document.location.origin}/${action}`;
	let method = data ? 'POST' : 'GET';
	let body = '';
	if (data) {
		let temp = {};
		for (let [key, val] of data) {
			temp[key] = val;
		}
		body = JSON.stringify(temp);
	}

	return fetch(url, {
		method,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body
	}).then((response) => response.json());
}

let nextButtons = document.getElementsByClassName('btn-next');
for (let button of nextButtons) {
	button.addEventListener('click', e => {
		button.parentElement.parentElement.parentElement.nextElementSibling.firstElementChild.checked = true;
	});
}
