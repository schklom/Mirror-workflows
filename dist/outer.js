(() => {
	'use strict';

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
			document.getElementById('xpath').value = data;
			let xpath = stripNumbers(data);
			highlightXpath(xpath);
		}
	}, false);

	function stripNumbers(xpath) {
		let p = xpath.split('/');
		p = p.map(node => {
			return node.replace(/\[[0-9]+\]$/, '');
		})
		return p.join('/');
	}

	// setTimeout(() => {
	// 	highlightXpath('id("dfx-termine")/DIV/DIV/H5')
	// },500);

})();
