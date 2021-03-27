<template>
	<form class="pure-form" id="loadForm" @submit.prevent="submit">
		<div class="pure-control-group">
			URL: <input id="name" type="url" name="url" placeholder="https://" v-model="url">
		</div>
		<div class="pure-control-group">
			Cookies: <input id="cookies" type="text" name="cookies" placeholder="key1=value1;key2=..." v-model="cookies">
		</div>
		<div class="pure-control-group">
			<label>
				Load Scripts
				<input type="checkbox"
					name="loadScripts"
					value="1"
					v-model="loadScripts"
				/>
			</label>
			<div class="pure-control-group">
				<label v-show="loadScripts">
					<input type="radio"
						name="waitFor"
						value="time"
						v-model="waitFor"
					/>
					Wait for x milliseconds:
					<input type="number"
						name="waitForTime"
						value="0"
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
						value="selector"
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
<script>
import { ajax, EventHub } from '../util.js';
export default {
	name: 'Loader',
	props: {
		feeds: Array
	},
	data() {
		return {
			copyFromVal: null,
			url: '',
			cookies: '',
			loadScripts: false,
			waitFor: 'time',
			waitForTime: 500,
			waitForSelector: '',
			loading: false
		}
	},
	created() {
		EventHub.$on('reset', () => {
			this.url = '';
			this.cookies = '';
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
			['url', 'cookies', 'loadScripts', 'waitFor', 'waitForSelector', 'waitForTime'].forEach(key => {
				this[key] = params[key];
			});
		}
	},
	methods: {
		submit() {
			this.loading = true;
			ajax('api/main/load-page', {
				url: this.url,
				cookies: this.cookies,
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
				EventHub.$emit('pageInfo', res);
				this.$emit('next');
			});
		}
	}
}
</script>
