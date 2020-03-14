<template>
	<div id="app">
		<h1>Angry Pol</h1>
	  	<nav>
	  		<ul>
	  			<li>
	  				Create new Feed
	  			</li>
	  			<li>
	  				Manage existing feeds
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
	  				<form-selector />
	  			</main>
	  		</article>
	  		<article>
	  			<input type="radio" name="accordion" id="acc_preview" value="3" v-model="accordion" />
	  			<label for="acc_preview">
	  				Preview Feed
	  			</label>
	  			<main>
	  				Feed preview
	  			</main>
	  		</article>
	  		<article>
	  			<input type="radio" name="accordion" id="acc_manage" value="4" v-model="accordion" />
	  			<label for="acc_manage">
	  				Manage Feeds
	  			</label>
	  			<main>
	  				Feed list
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

export default {
	name: 'App',
	components: {
		'form-loader': Loader,
		'form-selector': Selector
	},
	data() {
		return {
			accordion: 1
		}
	},
	methods: {
		startStep2() {
			this.accordion = 2;
			this.$root.$emit('iframe.reload');
		}
	}
}
</script>
