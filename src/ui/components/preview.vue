<template>
	<form class="pure-form pure-form-stacked" @submit.prevent="submit">
		<p>
			Preview your feed <a href="/raw/test-feed/" target="_blank">here</a>
		</p>
		<div class="pure-control-group">
			<label for="feedName">Specify a name:</label>
			<input id="feedName" type="text" v-model="name" minlength="1" maxlength="255">
		</div>
		<input type="submit" class="pure-button" value="Save" @click.prevent="submit" />
	</form>
</template>
<script>
import { ajax, EventHub } from '../util.js';
export default {
	name: 'Preview',
	data() {
		return {
			name: ''
		}
	},
	created() {
		EventHub.$on('reset', () => {
			this.name = '';
		});
		EventHub.$on('pageInfo', info => {
			this.name = info.name;
		});
	},
	methods: {
		submit() {
			ajax('/api/feed/create', {
				name: this.name
			}, true)
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
