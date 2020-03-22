<template>
	<form class="pure-form pure-form-stacked" id="loadForm" @submit.prevent="submit">
		<div class="pure-control-group">
			<input id="name" type="url" name="url" placeholder="https://" v-model="url">
		</div>
		<label>
			Load Scripts
			<input type="checkbox"
				name="loadScripts"
				value="1"
				v-model="loadScripts"
			/>
		</label>
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
		<input type="submit" class="pure-button" value="Load" @click.prevent="submit" :disabled="loading" />
	</form>
</template>
<script>
import { ajax, EventHub } from '../util.js';
export default {
	name: 'Loader',
	data() {
		return {
			url: '',
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
			this.loadScripts = false;
			this.waitForTime = 500;
			this.waitForSelector = '';
		});
	},
	methods: {
		submit() {
			this.loading = true;
			ajax('api/main/load-page', {
				url: this.url,
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
