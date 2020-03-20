const debug = require('debug')('ap:db');
const { exec } = require('child_process');

function waitForDatabase(dbUri) {
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
		},3000);
	});
}

function runMigrations(dbUri) {
	return new Promise(function(resolve, reject) {
		let cmd = `npx knex --migrations-directory migrations --client pg --connection ${dbUri.href} migrate:latest`;
		debug(cmd);
		let p = exec(cmd, {}, (err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

module.exports = {
	waitForDatabase,
	runMigrations
}
