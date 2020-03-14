import '../../node_modules/purecss/build/pure-min.css';
import './assets/custom.css';

(() => {
	'use strict';

	let selectionTarget = '';

	function highlightXpath(xpath) {
		send('highlight', xpath);
	}

	function send(action, data) {
		let iframe = document.getElementsByTagName('iframe')[0];
		iframe.contentWindow.postMessage(JSON.stringify({ action, data }), document.location.origin);
	}

	window.addEventListener('message', (msg) => {
		let { action, data } = JSON.parse(msg.data);
		console.log('message', action, data);
		if (action === 'selected') {
			let xpath = stripNumbers(data);
			document.getElementById(selectionTarget).value = xpath;
			highlightXpath(xpath);
			highlightSelectionTarget(false)
		}
	}, false);

	document.getElementById('xpath1').addEventListener('blur', e => {
		let xpath = e.target.value;
		highlightXpath(xpath);
	})
	document.getElementById('select1').addEventListener('click', e => {
		e.preventDefault();
		selectionTarget = 'xpath1';
		highlightSelectionTarget(true)
	})
	document.getElementById('xpath2').addEventListener('blur', e => {
		let xpath = e.target.value;
		highlightXpath(xpath);
	})
	document.getElementById('select2').addEventListener('click', e => {
		e.preventDefault();
		selectionTarget = 'xpath2';
		highlightSelectionTarget(true)
	})

	function highlightSelectionTarget(status) {
		document.getElementById(selectionTarget).style.background = status ? 'blue' : 'inherit';
	}

	function stripNumbers(xpath) {
		let p = xpath.split('/');
		p = p.map(node => {
			return node.replace(/\[[0-9]+\]$/, '');
		})
		return p.join('/');
	}

	document.getElementById('loadForm').addEventListener('submit', e => {
		e.preventDefault();
		let data = new FormData(e.target);
		console.log(data);
		ajax('api/main/load-page', data)
		.then(res => {
			console.log(res);
			document.getElementById('iframe').contentWindow.location.reload();
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

})();
