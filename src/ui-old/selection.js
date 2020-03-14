
import { fromEvent, Observable, map } from 'rxjs';

const input1 = document.getElementById('xpath1');
const button1 = document.getElementById('select1');

function highlightSelectionTarget(id) {
	const elem = typeof id === 'string' ? document.getElementById(id) : id;
	return (status) => {
		elem.style.background = status ? 'blue' : 'inherit';
	}
}

fromEvent(input1, 'blur')
	.pipe(
		map(e => e.value),
	).subscribe(highlightSelectionTarget())
const input1Selected = new Observable(subscriber => {
	subscriber.next(false);
});
input1Selected.subscribe({
	next(v) {
		if (v === false)
	}
})
