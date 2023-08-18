export function compactToNumber(compact: string): number {
	const match = compact.match(/[a-z]$/i);
	let factor = 1;
	if (match) {
		switch (match[0].toUpperCase()) {
			case "K":
				factor = 1000;
				break;
			case "M":
				factor = 1000000;
				break;
		}
	}

	return parseFloat(compact) * factor;
}
