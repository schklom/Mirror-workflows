<template>
	<div>
		<form class="pure-form pure-form-aligned" id="xpathForm" @submit.prevent="submit">
			<div class="simple-mode">
				<p>
					Now
					<button class="pure-button select1"
						:style="selectTitleStyle"
						@click.prevent="selectTitle"
					>select</button>
					the title of the first feed item!
					<span class="ok" v-if="found > 0">✔</span>
					<span class="error" v-else>✘</span>
				</p>
				<p>
					And optionally
					<button class="pure-button select2"
						:style="selectDescriptionStyle"
						@click.prevent="selectDescription"
					>select</button>
					the description of the same item.
					<span class="ok" v-if="pathDescription.length > 0">✔</span>
					<span class="error" v-else>✘</span>
				</p>
				<p v-if="pathTitle.length > 0">
					Found <input readonly class="pure-input-1-5" style="width: 64px" v-model="found" /> entries.
				</p>
			</div>
			<button
				@click="expertMode = true"
				v-if="!expertMode"
				class="pure-button"
			>
				Enable expert mode
			</button>
			<div class="advanced-mode" v-else>
				<div class="pure-control-group">
					<label for="name">Title</label>
					<input type="text"
						class="pure-input-2-3"
						v-model="pathTitle"
						required
						@blur="blur"
					/>
				</div>
				<div class="pure-control-group">
					<label for="name">Link</label>
					<input type="text"
						class="pure-input-2-3"
						required
						v-model="pathLink"
						@blur="blur"
					/>
				</div>
				<div class="pure-control-group">
					<label for="name">Description (optional)</label>
					<input type="text"
						class="pure-input-2-3"
						v-model="pathDescription"
						@blur="blur"
					/>
				</div>
				<div class="pure-control-group">
					<label for="name">Entry (computed)</label>
					<input type="text"
						class="pure-input-1-2"
						v-model="pathEntry"
						@blur="blur"
					/>
					(found <input readonly class="pure-input-1-5" style="width: 64px" v-model="found" />)
				</div>
			</div>

			<button class="pure-button pure-button-primary btn-next" @click.prevent="submit">Next</button>
		</form>
		<iframe ref="iframe" id="iframe" src="/raw/iframe/" width="100%" height="600px"></iframe>
	</div>
</template>
<script>
import { EventHub, sendEvent, send, ajax } from '../util.js';

export default {
	name: 'Selector',
	data() {
		return {
			expertMode: false,
			pathTitleAbsolute: '',
			pathDescriptionAbsolute: '',
			pathTitle: '',
			pathDescription: '',
			pathEntry: '',
			pathLink: './ancestor-or-self::node()/@href',
			found: 0,
			selecting: '',
			selectTitleColor: '#ffaa00',
			selectDescriptionColor: '#aaaa00'
		}
	},
	created() {
		this.$root.$on('iframe.reload', () => {
			this.$refs.iframe.contentWindow.location.reload();
		});
		EventHub.$on('selected', this.selected.bind(this));
	},
	computed: {
		selectTitleStyle() {
			let r = {};
			if (this.selecting === 'title') r.background = this.selectTitleColor;
			return r;
		},
		selectDescriptionStyle() {
			let r = {};
			if (this.selecting === 'description') r.background = this.selectDescriptionColor;
			return r;
		}
	},
	methods: {
		submit() {
			ajax('api/main/set-selectors', {
				pathTitle: this.pathTitle,
				pathEntry: this.pathEntry,
				pathDescription: this.pathDescription,
				pathLink: this.pathLink
			})
			.then(res => {
				if (res.error) {
					return;
				}
				this.$emit('next');
			});
		},
		selectTitle() {
			this.selecting = 'title';
			sendEvent('selectionToggle', { enabled: true, color: this.selectTitleColor });
		},
		selectDescription() {
			this.selecting = 'description';
			sendEvent('selectionToggle', { enabled: true, color: this.selectDescriptionColor });
		},
		async blur(e) {
			this.found = await send('highlight', this.pathEntry);
		},
		async selected(data) {
			sendEvent('selectionToggle', { enabled: false });
			if (!this.selecting) return;
			console.log('selected', data);
			let xpath = this.stripNumbers(data);
			if (this.selecting === 'title') {
				this.pathTitleAbsolute = xpath;
			} else if (this.selecting === 'description') {
				this.pathDescriptionAbsolute = xpath;
			}
			this.selecting = '';
			this.updateEntry();
			this.found = await send('highlight', this.pathEntry);

		},
		stripNumbers(xpath) {
			let p = xpath.split('/');
			p = p.map(node => {
				return node.replace(/\[[0-9]+\]$/, '');
			})
			return p.join('/');
		},
		updateEntry() {
			let path1 = this.pathTitleAbsolute;
			let path2 = this.pathDescriptionAbsolute;
			if (path2) {
				let path3 = '';
				for (let i=0, ii=path1.length; i<ii; i++) {
					if (path1[i] === path2[i]) {
						path3 = path3 + path1[i];
					} else {
						break;
					}
				}
				this.pathEntry = path3.replace(/\/$/, '');
				this.pathTitle = '.' + this.pathTitleAbsolute.substr(this.pathEntry.length) + '/text()';
				this.pathLink = '.' + this.pathTitleAbsolute.substr(this.pathEntry.length) + '/ancestor-or-self::node()/@href';
				this.pathDescription = '.' + this.pathDescriptionAbsolute.substr(this.pathEntry.length) + '/text()';
			} else {
				this.pathEntry = path1;
				this.pathTitle = './text()';
				this.pathLink = './ancestor-or-self::node()/@href';
				this.pathDescription = '';
			}
		}
	}
}
</script>
