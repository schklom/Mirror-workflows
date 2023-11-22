<template>
	<form class="pure-form" id="loadForm" @submit.prevent="submit">
		<div class="pure-control-group">
			URL: <input id="name" type="url" name="url" placeholder="https://" v-model="url">
		</div>
		<div class="pure-control-group">
			<label>
				Show Advanced Options
				<input type="checkbox"
					name="showMoreOptions"
					v-model="showMoreOptions"
				/>
			</label>
			<div class="pure-control-group">
				<label v-show="showMoreOptions">
					Cookies:
					<input id="cookies" type="text" name="cookies" placeholder="key1=value1;key2=..." v-model="cookies" style="width: 420px">
				</label>
			</div>
			<div class="pure-control-group">
				<label v-show="showMoreOptions">
					Request Body:
					<input type="text" name="body" v-model="body" style="width: 420px">
				</label>
			</div>
			<div class="pure-control-group">
				<label v-show="showMoreOptions">
					Custom Headers:
					<textarea name="headers" v-model="headers" cols="50" rows="3" placeholder="Content-Type: application/json"></textarea>
				</label>
			</div>
		</div>
		<div class="pure-control-group">
			<label>
				Load Scripts
				<input type="checkbox"
					name="loadScripts"
					v-model="loadScripts"
				/>
			</label>
			<div class="pure-control-group">
				<label v-show="loadScripts">
					<input type="radio"
						name="waitFor"
						v-model="waitFor"
					/>
					Wait for x milliseconds:
					<input type="number"
						name="waitForTime"
						min="100"
						step="1"
						max="10000"
						v-model="waitForTime"
						@input="waitFor='time'"
					/>
				</label>
			</div>
			<div class="pure-control-group">
				<label v-show="loadScripts">
					<input type="radio"
						name="waitFor"
						v-model="waitFor"
					/>
					Wait for selector:
					<input type="text"
						name="waitForSelector"
						v-model="waitForSelector"
						minlength="2"
						maxlength="255"
						@input="waitFor='selector'"
					/>
				</label>
			</div>
		</div>
		<div class="pure-control-group" v-if="feeds.length > 0">
			Copy from feed:
			<select v-model="copyFromVal">
				<option>
					-
				</option>
				<option v-for="entry of feeds" :key="entry.uid" :value="entry.uid">
					{{ entry.title }}
				</option>
			</select>
		</div>
		<div class="pure-control-group">
			<input type="submit" class="pure-button" value="Load" @click.prevent="submit" :disabled="loading" />
		</div>
	</form>
</template>
<script lang="ts">
import type { PropType } from 'vue';
import { ajax, EventHub } from '../service/util.js';
import type { Feed } from '@/types';
export default {
	name: 'Loader',
	props: {
		feeds: {
			type: Array as PropType<Feed[]>,
			required: true
		}
	},
	data() {
		return {
			copyFromVal: null,
			url: '',
			cookies: '',
			body: '',
			headers: '',
			loadScripts: false,
			waitFor: 'time',
			waitForTime: 500,
			waitForSelector: '',
			loading: false,
			showMoreOptions: false
		}
	},
	created() {
		EventHub.on('reset', () => {
			this.url = '';
			this.cookies = '';
			this.body = '';
			this.headers = '';
			this.loadScripts = false;
			this.waitForTime = 500;
			this.waitForSelector = '';
			this.copyFromVal = null;
		});
	},
	computed: {
		feedLoadOptions() {
			return Object.fromEntries(this.feeds.map(e => {
				return [
					e.uid,
					e.title
				]
			}))
		}
	},
	watch: {
		copyFromVal(nv) {
			if (!nv) return;
			let entry = this.feeds.find(e => e.uid === nv);
			if (!entry) return;
			let params = entry.loadparams;
			['url', 'cookies', 'loadScripts', 'waitFor', 'waitForSelector', 'waitForTime', 'body', 'headers'].forEach(key => {
				if (key === 'headers') {
					if (params[key] && typeof params[key] === 'object') {
						this[key] = Object.entries(params[key]).map(([k, v]) => `${k}: ${v}`).join('\n')
					}
				} else {
					this[key] = params[key];
				}
			});
		}
	},
	methods: {
		submit() {
			this.loading = true;
			ajax('api/main/load-page', {
				url: this.url,
				cookies: this.cookies,
				body: this.body,
				headers: this.parseHeaders(),
				loadScripts: this.loadScripts,
				waitFor: this.waitFor,
				waitForTime: this.waitForTime,
				waitForSelector: this.waitForSelector
			})
			.then(res => {
				this.loading = false;
				if (res.error) {
					return;
				}
				EventHub.emit('pageInfo', res);
				this.$emit('next');
			});
		},
		parseHeaders() {
			let lines = this.headers.split('\n');
			let entries: [string, string][] = [];
			for (let line of lines) {
				line = line.trim();
				if (!line.length) continue;
				let xpos = line.indexOf(':');
				if (xpos < 1) continue;
				let key = line.substring(0, xpos).trim();
				let value = line.substring(xpos+1).trim();
				if (!key.length || !value.length) continue;
				entries.push([key, value])
			}
			return Object.fromEntries(entries);
		}
	}
}
</script>
