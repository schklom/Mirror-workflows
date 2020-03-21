<template>
	<div>
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
						Delete
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in feeds">
					<td>
						<a :href="item.url" target="_blank">{{ item.title }}</a>
					</td>
					<td>
						{{ item.created | localeDate }}
					</td>
					<td>
						{{ item.lastcheck | localeDate }}
					</td>
					<td>
						{{ item.nextcheck | localeDate }}
					</td>
					<td>
						{{ item.errorcount }}
					</td>
					<td>
						{{ item.checkinterval }}
					</td>
					<td>
						<a :href="getLink(item)">Link</a>
					</td>
					<td>
						<button class="pure-button" @click.prevent="deleteFeed(item)">✘</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
<script>
import { ajax, EventHub } from '../util.js';

export default {
	name: 'FeedList',
	data() {
		return {
			feeds: []
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
		this.refresh();
		EventHub.$on('refreshFeeds', this.refresh.bind(this));
	},
	methods: {
		refresh() {
			return ajax('/api/feed/list')
				.then(res => {
					this.feeds = res;
				});
		},
		deleteFeed(feed) {
			ajax('/api/feed/delete', { id: feed.id }, true)
			.then(res => {

			})
		},
		getLink(item) {
			return `${document.location.origin}/api/feed/get/${item.uid}/${item.secret}/`
		}
	}
}
</script>
