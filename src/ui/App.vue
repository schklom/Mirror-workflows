<template>
	<div id="app">
		<h1>Angry Pol</h1>
	  	<nav>
	  		<ul>
	  			<li>
	  				<a href="#" @click.prevent="accordion = 1">Create new Feed</a>
	  			</li>
	  			<li>
	  				<a href="#" @click.prevent="accordion = 4">Manage existing feeds</a>
	  			</li>
	  		</ul>
	  	</nav>
	  	<div id="accordion">
	  		<article>
	  			<input type="radio" name="accordion" id="acc_loader" value="1" v-model="accordion" />
	  			<label for="acc_loader">
	  				Load target page
	  			</label>
	  			<main>
	  				<form-loader @next="startStep2" />
	  			</main>
	  		</article>
	  		<article>
	  			<input type="radio" name="accordion" id="acc_select" value="2" v-model="accordion" />
	  			<label for="acc_select">
	  				Select items
	  			</label>
	  			<main>
	  				<form-selector @next="startStep3" />
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
	  				<feed-list />
	  			</main>
	  		</article>
		</div>
	</div>
</template>

<script>
import '../../node_modules/purecss/build/pure-min.css';
import '../assets/custom.scss';
import Loader from './components/loader.vue';
import Selector from './components/selector.vue';
import Preview from './components/preview.vue';
import List from './components/list.vue';
import { EventHub } from './util.js';

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
			accordion: 0
		}
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
		}
	}
}
</script>
