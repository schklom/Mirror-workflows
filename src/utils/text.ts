export function replaceBrWithNewline(html: string) {
	return html.replace(/<br>/g, "\n");
}

export function stripHtmlTags(html: string) {
	return html.replace(/<(.|\n)*?>/g, "");
}

export function reverseString(str: string): string {
	return str.split("").reverse().join("");
}

export function convertToBase64(text: string): string {
	return Buffer.from(text).toString("base64");
}

export function convertFromBase64(base64: string): string {
	return Buffer.from(base64, "base64").toString("utf-8");
}

export function extractTagsAndUsers(text: string): {
	tags: string[];
	users: string[];
} {
	const regex = /([#@])([^ ]+)([\s]+|$)/g;
	const matches: { tags: string[]; users: string[] } = {
		tags: [],
		users: [],
	};

	let match: RegExpExecArray | null;

	// rome-ignore lint/suspicious/noAssignInExpressions: <explanation>
	while ((match = regex.exec(text.replaceAll("\n", " "))) !== null) {
		const txt = stripHtmlTags(match[2]);
		const usernameOrTag = txt.replace(/[^a-zA-Z0-9]$/, "").replace(/<[^>]*$/, "");
		if (match[1] === "@") {
			matches.users.push(usernameOrTag);
		} else {
			matches.tags.push(usernameOrTag);
		}
	}

	return matches;
}
