<template>
	<div>
		<div v-show="errors?.length">
			<ul>
				<li v-for="e in errors">
					<strong>{{ e.message }}</strong>
					<p v-show="!!e.stack">
						{{ e.stack }}
					</p>
				</li>
			</ul>
			<button class="pure-button" @click="errors=[]">Close</button>
		</div>
		<div v-if="edit && edit.uid">
			<form class="pure-form pure-form-stacked" @submit.prevent="save">
				<div class="pure-control-group">
					<label>Title: </label>
					<input type="text" v-model="edit.title" minlength="1" maxlength="255">
				</div>
				<div class="pure-control-group">
					<label>Description: </label>
					<input type="text" v-model="edit.description" minlength="1" maxlength="255">
				</div>
				<div class="pure-control-group">
					<label>Check interval in minutes: </label>
					<input type="number" step="1" min="1" v-model="edit.checkinterval" />
				</div>
				<div class="pure-control-group">
					<label>Max items per generated feed: </label>
					<input type="number" min="1" max="500" step="1" v-model="edit.maxitems" />
				</div>
				<div class="pure-control-group">
					<label>Create feed items from errors: </label>
					<input type="checkbox" :value="true" v-model="edit.inserterrorsasitems" />
				</div>
				<div class="pure-control-group">
					<label>Create error if no items are found: </label>
					<input type="checkbox" :value="true" v-model="edit.noitemsiserror" />
				</div>

				<button class="pure-button" @click.prevent="save">✔ Save</button> -
				<button class="pure-button" @click.prevent="refreshSecret">Refresh secret</button>  -
				<button class="pure-button" @click.prevent="deleteFeed">✘ Delete</button> -
				<button class="pure-button" @click.prevent="edit = null">Close</button>
			</form>
		</div>
		<table class="pure-table">
			<thead>
				<tr>
					<th>
						Title
					</th>
					<th>
						Created
					</th>
					<th>
						Last Check
					</th>
					<th>
						Next Check
					</th>
					<th>
						Failed to check
					</th>
					<th>
						Check interval in minutes
					</th>
					<th>
						Feed
					</th>
					<th>
						Actions
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in feeds">
					<td>
						<a :href="item.url" target="_blank">{{ item.title }}</a>
					</td>
					<td>
						{{ localeDate(item.created) }}
					</td>
					<td>
						{{ localeDate(item.lastcheck) }}
					</td>
					<td>
						{{ localeDate(item.nextcheck) }}
					</td>
					<td>
						{{ item.errorcount }}
						<a href="#" @click.prevent="showErrors(item)" v-show="item.log && item.log.errors && item.log.errors.length">Show</a>
					</td>
					<td>
						{{ item.checkinterval }}
					</td>
					<td>
						<a :href="getLink(item)" target="_blank">Link</a>
					</td>
					<td>
						<button class="pure-button" @click.prevent="editFeed(item)">Edit</button>
					</td>
				</tr>
			</tbody>
		</table>

	</div>
</template>
<script lang="ts">
import type { PropType } from 'vue';
import { ajax, EventHub } from '../service/util.js';
import type { Feed } from '@/types';

export default {
	name: 'FeedList',
	props: {
		feeds: {
			type: Array as PropType<Feed[]>,
			required: true
		}
	},
	data() {
		return {
			errors: [] as Error[],
			edit: {} as Partial<Feed>|null
		}
	},
	filters: {
		localeDate(s) {
			if (!s) return '';
			let d = new Date(s);
			return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
		}
	},
	created() {
	},
	computed: {
		link(item) {
			return `${document.location.origin}/api/feed/get/${item.uid}/${item.secret}/`
		}
	},
	methods: {
		async deleteFeed() {
			await ajax('/api/feed/delete', { uid: this.edit!.uid }, true)
			let idx = this.feeds.findIndex(f => f.uid === this.edit!.uid);
			this.feeds.splice(idx, 1);
			this.edit = null;
		},
		getLink(item) {
			return `${document.location.origin}/feed/get/${item.uid}/${item.secret}/`
		},
		showErrors(item) {
			this.errors = item.log.errors;
		},
		editFeed(item) {
			this.edit = {
				uid: item.uid,
				title: item.title,
				description: item.description,
				checkinterval: item.checkinterval,
				maxitems: item.maxitems,
				inserterrorsasitems: item.inserterrorsasitems,
				noitemsiserror: item.noitemsiserror
			};
		},
		async refreshSecret() {
			let data = await ajax('/api/feed/refreshsecret', { uid: this.edit!.uid });
			let idx = this.feeds.findIndex(f => f.uid === data.uid);
			this.feeds[idx].secret = data.secret;
			this.edit = null;
		},
		async save() {
			let data = await ajax('/api/feed/save', this.edit);
			let idx = this.feeds.findIndex(f => f.uid === data.uid);
			this.feeds.splice(idx, 1, data);
			this.edit = null;
		},
		localeDate(d) {
			let dd = new Date(d)
			return `${dd.toLocaleDateString()} ${dd.toLocaleTimeString()}`
		}
	}
}
</script>
