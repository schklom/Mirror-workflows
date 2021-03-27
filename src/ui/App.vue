<template>
	<div id="app">
		<h1>FeedroPolis</h1>
	  	<nav v-if="!error">
	  		<ul>
	  			<li>
	  				<a href="#" @click.prevent="accordion = 1">Create new Feed</a>
	  			</li>
	  			<li>
	  				<a href="#" @click.prevent="accordion = 4">Manage existing feeds</a>
	  			</li>
	  		</ul>
	  	</nav>
		<div id="error" v-else>
			{{ error }}
			{{ error.data }}
		</div>
	  	<div id="accordion">
	  		<article>
	  			<input type="radio" name="accordion" id="acc_loader" value="1" v-model="accordion" />
	  			<label for="acc_loader">
	  				Load target page
	  			</label>
	  			<main>
	  				<form-loader @next="startStep2" :feeds="feeds" />
	  			</main>
	  		</article>
	  		<article>
	  			<input type="radio" name="accordion" id="acc_select" value="2" v-model="accordion" />
	  			<label for="acc_select">
	  				Select items
	  			</label>
	  			<main>
	  				<form-selector @next="startStep3" :feeds="feeds" />
	  			</main>
	  		</article>
	  		<article>
	  			<input type="radio" name="accordion" id="acc_preview" value="3" v-model="accordion" />
	  			<label for="acc_preview">
	  				Preview Feed
	  			</label>
	  			<main>
	  				<form-preview @next="done" />
	  			</main>
	  		</article>
	  		<article>
	  			<input type="radio" name="accordion" id="acc_manage" value="4" v-model="accordion" />
	  			<label for="acc_manage">
	  				Manage Feeds
	  			</label>
	  			<main>
	  				<feed-list :feeds="feeds" />
	  			</main>
	  		</article>
		</div>
	</div>
</template>

<script>
import '../../node_modules/purecss/build/pure-min.css';
import '../assets/custom.less';
import Loader from './components/loader.vue';
import Selector from './components/selector.vue';
import Preview from './components/preview.vue';
import List from './components/list.vue';
import { ajax, EventHub } from './util.js';

export default {
	name: 'App',
	components: {
		'form-loader': Loader,
		'form-selector': Selector,
		'form-preview': Preview,
		'feed-list': List
	},
	data() {
		return {
			feeds: [],
			accordion: 0,
			error: null
		}
	},
	created() {
		EventHub.$on('requestError', e => {
			this.error = e;
			this.accordion = -1;
		})
		this.refreshFeeds();
		EventHub.$on('refreshFeeds', this.refreshFeeds.bind(this));
	},
	methods: {
		startStep2() {
			this.accordion = 2;
			this.$root.$emit('iframe.reload');
		},
		startStep3() {
			this.accordion = 3;
		},
		done() {
			this.accordion = 4;
			EventHub.$emit('refreshFeeds');
			EventHub.$emit('reset');
		},
		refreshFeeds() {
			return ajax('/api/feed/list')
				.then(res => {
					this.feeds = res;
				});
		},
	}
}
</script>
