export function mediaIdToShortcode(id: string): string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let shortcode = "";
	let num = BigInt(id);
	while (num > 0n) {
		const remainder = num % 64n;
		num = num / 64n;
		shortcode = alphabet.charAt(Number(remainder)) + shortcode;
	}
	return shortcode;
}

export function shortcodeToMediaId(shortcode: string): string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let num = BigInt(0);
	for (let i = 0; i < shortcode.length; i++) {
		const char = shortcode.charAt(i);
		const value = BigInt(alphabet.indexOf(char));
		num = num * 64n + value;
	}
	return num.toString();
}
