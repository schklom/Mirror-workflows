import axios from "axios";
import { readFileSync } from "node:fs";

export const axiosInstance = axios.create({
	baseURL: "http://127.0.0.1:3000/api/",
});

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGitHash() {
	const rev = readFileSync(".git/HEAD")
		.toString()
		.trim()
		.split(/.*[: ]/)
		.slice(-1)[0];
	if (rev.indexOf("/") === -1) {
		return rev;
	} else {
		return readFileSync(`.git/${rev}`).toString().trim();
	}
}
