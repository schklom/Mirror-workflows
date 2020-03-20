<template>
	<form class="pure-form pure-form-stacked" @submit.prevent="submit">
		<p>
			Preview your feed <a href="/raw/test-feed/" target="_blank">here</a>
		</p>
		<input type="submit" class="pure-button" value="Save" @click.prevent="submit" />
	</form>
</template>
<script>
import { ajax } from '../util.js';
export default {
	name: 'Preview',
	data() {
		return {
			url: '',
			loadScripts: false,
			waitFor: 'time',
			waitForTime: 0,
			waitForSelector: ''
		}
	},
	methods: {
		submit() {
			ajax('/api/feed/create', {}, true)
			.then(res => {
				if (res.error) {
					return;
				}
				this.$emit('next');
			});
		}
	}
}
</script>
