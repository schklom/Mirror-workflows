import Debug from 'debug';
const debug = Debug('ap:db');
import { exec } from 'child_process';

export function waitForDatabase(dbUri): Promise<void> {
	return new Promise(function(resolve, reject) {
		let cmd = `bash -c 'while !</dev/tcp/${dbUri.hostname}/${dbUri.port}; do sleep 1; done;'`;
		debug(cmd);
		let p = exec(cmd, {}, (err) => {
			if (err) reject(err);
			else resolve();
		});
		setTimeout(() => {
			if (p.killed) return;
			p.kill();
			reject(new Error('timeout connecting to database'));
		},6000);
	});
}

export function runMigrations(dbUri): Promise<void> {
	return new Promise(function(resolve, reject) {
		let cmd = `node_modules/.bin/knex --migrations-directory migrations --client pg --connection ${dbUri.href} migrate:latest`;
		debug(cmd);
		let p = exec(cmd, {}, (err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}
