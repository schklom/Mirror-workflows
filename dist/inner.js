(() => {
	'use strict';
	document.addEventListener('click', e => {
		e.preventDefault();
		e.stopImmediatePropagation();
		e.stopPropagation();
		console.log(e);
	    const path = getPathTo(e.target);
		send('selected', path);
	}, false);

	function send(action, data) {
		window.parent.postMessage(JSON.stringify({ action, data }), document.location.origin);
	}

	window.addEventListener('message', (msg) => {
		let { action, data } = JSON.parse(msg.data);
		console.log('message', action, data);
		if (action === 'highlight') {
			highlightXpath(data);
		}
	}, false);


	function highlightXpath(xpath, reset) {
		let res = document.evaluate(xpath, document);
		let elem;
		while (elem = res.iterateNext()) {
			elem.style.background = reset ? 'inherit' : 'yellow';
		}
		if (!reset) setTimeout(() => highlightXpath(xpath, true), 2000);
	}

	function getPathTo(element) {
	    if (element.id!=='')
	        return 'id("'+element.id+'")';
	    if (element===document.body)
	        return element.tagName;

	    let ix= 0;
	    let siblings= element.parentNode.childNodes;
	    for (let i= 0; i<siblings.length; i++) {
	        let sibling= siblings[i];
	        if (sibling===element)
	            return getPathTo(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
	        if (sibling.nodeType===1 && sibling.tagName===element.tagName)
	            ix++;
	    }
	}

	console.log('inner loaded');

})();
