
export async function getKey() {
	let key = localStorage.getItem('fp_local_key');
	if (!key) {
		key = await createKey();
		localStorage.setItem('fp_local_key', key);
	}
	return key;
}

async function createKey() {
	return crypto.randomUUID();
}
