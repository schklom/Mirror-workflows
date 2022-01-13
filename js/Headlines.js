'use strict';

/* global __, ngettext, Article, App */
/* global dojo, dijit, PluginHost, Notify, xhr, Feeds */
/* global CommonDialogs */

const Headlines = {
	vgroup_last_feed: undefined,
	_headlines_scroll_timeout: 0,
	//_observer_counters_timeout: 0,
	headlines: [],
	current_first_id: 0,
	_scroll_reset_timeout: false,
	default_force_previous: false,
	default_force_to_top: false,
	line_scroll_offset: 120, /* px */
	sticky_header_observer: new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				const header = entry.target.closest('.cdm').querySelector(".header");

				if (entry.isIntersecting) {
					header.removeAttribute("data-is-stuck");
				} else {
					header.setAttribute("data-is-stuck", "true");
				}

				//console.log(entry.target, entry.intersectionRatio, entry.isIntersecting, entry.boundingClientRect.top);
			});
		},
		{threshold: [0, 1], root: document.querySelector("#headlines-frame")}
	),
	sticky_content_observer: new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				const header = entry.target.closest('.cdm').querySelector(".header");

				header.style.position = entry.isIntersecting ? "sticky" : "unset";

				//console.log(entry.target, entry.intersectionRatio, entry.isIntersecting, entry.boundingClientRect.top);
			});
		},
		{threshold: [0, 1], root: document.querySelector("#headlines-frame")}
	),
	unpack_observer: new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				if (entry.intersectionRatio > 0)
					Article.unpack(entry.target);
			});
		},
		{threshold: [0], root: document.querySelector("#headlines-frame")}
	),
	row_observer: new MutationObserver((mutations) => {
		const modified = [];

		mutations.forEach((m) => {
			if (m.type == 'attributes' && ['class', 'data-score'].indexOf(m.attributeName) != -1) {

				const row = m.target;
				const id = row.getAttribute("data-article-id");

				if (Headlines.headlines[id]) {
					const hl = Headlines.headlines[id];

					if (hl) {
						const hl_old = {...{}, ...hl};

						hl.unread = row.hasClassName("Unread");
						hl.marked = row.hasClassName("marked");
						hl.published = row.hasClassName("published");

						// not sent by backend
						hl.selected = row.hasClassName("Selected");
						hl.active = row.hasClassName("active");

						hl.score = row.getAttribute("data-score");

						modified.push({id: hl.id, new: hl, old: hl_old, row: row});
					}
				}
			}
		});

		PluginHost.run(PluginHost.HOOK_HEADLINE_MUTATIONS, mutations);

		Headlines.updateSelectedPrompt();

		window.requestIdleCallback(() => {
			Headlines.syncModified(modified);
		});
	}),
	syncModified: function (modified) {
		const ops = {
			tmark: [],
			tpub: [],
			read: [],
			unread: [],
			select: [],
			deselect: [],
			activate: [],
			deactivate: [],
			rescore: {},
		};

		modified.forEach(function (m) {
			if (m.old.marked != m.new.marked)
				ops.tmark.push(m.id);

			if (m.old.published != m.new.published)
				ops.tpub.push(m.id);

			if (m.old.unread != m.new.unread)
				m.new.unread ? ops.unread.push(m.id) : ops.read.push(m.id);

			if (m.old.selected != m.new.selected)
				m.new.selected ? ops.select.push(m.row) : ops.deselect.push(m.row);

			if (m.old.active != m.new.active)
				m.new.active ? ops.activate.push(m.row) : ops.deactivate.push(m.row);

			if (m.old.score != m.new.score) {
				const score = m.new.score;

				ops.rescore[score] = ops.rescore[score] || [];
				ops.rescore[score].push(m.id);
			}
		});

		ops.select.forEach((row) => {
			const cb = dijit.getEnclosingWidget(row.querySelector(".rchk"));

			if (cb)
				cb.attr('checked', true);
		});

		ops.deselect.forEach((row) => {
			const cb = dijit.getEnclosingWidget(row.querySelector(".rchk"));

			if (cb && !row.hasClassName("active"))
				cb.attr('checked', false);
		});

		ops.activate.forEach((row) => {
			const cb = dijit.getEnclosingWidget(row.querySelector(".rchk"));

			if (cb)
				cb.attr('checked', true);
		});

		ops.deactivate.forEach((row) => {
			const cb = dijit.getEnclosingWidget(row.querySelector(".rchk"));

			if (cb && !row.hasClassName("Selected"))
				cb.attr('checked', false);
		});

		const promises = [];

		if (ops.tmark.length != 0)
			promises.push(xhr.post("backend.php",
				{op: "rpc", method: "markSelected", "ids[]": ops.tmark, cmode: 2}));

		if (ops.tpub.length != 0)
			promises.push(xhr.post("backend.php",
				{op: "rpc", method: "publishSelected", "ids[]": ops.tpub, cmode: 2}));

		if (ops.read.length != 0)
			promises.push(xhr.post("backend.php",
				{op: "rpc", method: "catchupSelected", "ids[]": ops.read, cmode: 0}));

		if (ops.unread.length != 0)
			promises.push(xhr.post("backend.php",
				{op: "rpc", method: "catchupSelected", "ids[]": ops.unread, cmode: 1}));

		const scores = Object.keys(ops.rescore);

		if (scores.length != 0) {
			scores.forEach((score) => {
				promises.push(xhr.post("backend.php",
					{op: "article", method: "setScore", "ids[]": ops.rescore[score], score: score}));
			});
		}

		Promise.allSettled(promises).then((results) => {
			let feeds = [];
			let labels = [];

			results.forEach((res) => {
				if (res) {
					try {
						const obj = JSON.parse(res.value);

						if (obj.feeds)
							feeds = feeds.concat(obj.feeds);

						if (obj.labels)
							labels = labels.concat(obj.labels);

					} catch (e) {
						console.warn(e, res);
					}
				}
			});

			if (feeds.length > 0) {
				console.log('requesting counters for', feeds, labels);
				Feeds.requestCounters(feeds, labels);
			}

			PluginHost.run(PluginHost.HOOK_HEADLINE_MUTATIONS_SYNCED, results);
		});
	},
	click: function (event, id, in_body) {
		in_body = in_body || false;

		if (event.shiftKey && Article.getActive()) {
			Headlines.select('none');

			const ids = Headlines.getRange(Article.getActive(), id);

			console.log(Article.getActive(), id, ids);

			for (let i = 0; i < ids.length; i++)
				Headlines.select('all', ids[i]);

		} else if (event.ctrlKey) {
			Headlines.select('invert', id);
		} else {
			// eslint-disable-next-line no-lonely-if
			if (App.isCombinedMode()) {

				if (event.altKey && !in_body) {

					Article.openInNewWindow(id);
					Headlines.toggleUnread(id, 0);

				} else if (Article.getActive() != id) {

					Headlines.select('none');

					const scroll_position_A = App.byId(`RROW-${id}`).offsetTop - App.byId("headlines-frame").scrollTop;

					Article.setActive(id);

					if (App.getInitParam("cdm_expanded")) {

						if (!in_body)
							Article.openInNewWindow(id);

						Headlines.toggleUnread(id, 0);
					} else {
						const scroll_position_B = App.byId(`RROW-${id}`).offsetTop - App.byId("headlines-frame").scrollTop;

						// this would only work if there's enough space
						App.byId("headlines-frame").scrollTop -= scroll_position_A-scroll_position_B;

						Article.cdmMoveToId(id);
					}

				} else if (in_body) {
					Headlines.toggleUnread(id, 0);
				} else { /* !in body */
					Article.openInNewWindow(id);
				}

				return in_body;
			} else {
				// eslint-disable-next-line no-lonely-if
				if (event.altKey) {
					Article.openInNewWindow(id);
					Headlines.toggleUnread(id, 0);
				} else {
					Headlines.select('none');
					Article.view(id);
				}
			}
		}

		return false;
	},
	initScrollHandler: function () {
		App.byId("headlines-frame").onscroll = (event) => {
			clearTimeout(this._headlines_scroll_timeout);
			this._headlines_scroll_timeout = window.setTimeout(function () {
				//console.log('done scrolling', event);
				Headlines.scrollHandler(event);
			}, 50);
		}
	},
	loadMore: function () {
		const view_mode = dijit.byId("toolbar-main").getValues().view_mode;
		const unread_in_buffer = App.findAll("#headlines-frame > div[id*=RROW][class*=Unread]").length;
		const num_all = App.findAll("#headlines-frame > div[id*=RROW]").length;
		const num_unread = Feeds.getUnread(Feeds.getActive(), Feeds.activeIsCat());

		// TODO implement marked & published

		let offset = num_all;

		switch (view_mode) {
			case "marked":
			case "published":
				console.warn("loadMore: ", view_mode, "not implemented");
				break;
			case "unread":
				offset = unread_in_buffer;
				break;
			case "adaptive":
				if (!(Feeds.getActive() == -1 && !Feeds.activeIsCat()))
					offset = num_unread > 0 ? unread_in_buffer : num_all;
				break;
		}

		console.log("loadMore, offset=", offset);

		Feeds.open({feed: Feeds.getActive(), is_cat: Feeds.activeIsCat(), offset: offset, append: true});
	},
	isChildVisible: function (elem) {
		return App.Scrollable.isChildVisible(elem, App.byId("headlines-frame"));
	},
	firstVisible: function () {
		const rows = App.findAll("#headlines-frame > div[id*=RROW]");

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];

			if (this.isChildVisible(row)) {
				return row.getAttribute("data-article-id");
			}
		}
	},
	unpackVisible: function(container) {
		const rows = App.findAll("#headlines-frame > div[id*=RROW][data-content].cdm");

		for (let i = 0; i < rows.length; i++) {
			if (App.Scrollable.isChildVisible(rows[i], container)) {
				console.log('force unpacking:', rows[i].getAttribute('id'));
				Article.unpack(rows[i]);
			}
		}
	},
	scrollHandler: function (/*event*/) {
		try {
			if (!Feeds.infscroll_disabled && !Feeds.infscroll_in_progress) {
				const hsp = App.byId("headlines-spacer");
				const container = App.byId("headlines-frame");

				if (hsp && hsp.previousSibling) {
					const last_row = hsp.previousSibling;

					// invoke lazy load if last article in buffer is nearly visible OR is active
					if (Article.getActive() == last_row.getAttribute("data-article-id") || last_row.offsetTop - 250 <= container.scrollTop + container.offsetHeight) {
						hsp.innerHTML = `<span class='text-muted text-small text-center'><img class="icon-three-dots" src="${App.getInitParam('icon_three_dots')}"> ${__("Loading, please wait...")}</span>`;

						Headlines.loadMore();
						return;
					}
				}
			}

			if (App.isCombinedMode() && App.getInitParam("cdm_expanded")) {
				const container = App.byId("headlines-frame")

				/* don't do anything until there was some scrolling */
				if (container.scrollTop > 0)
					Headlines.unpackVisible(container);
			}

			if (App.getInitParam("cdm_auto_catchup")) {

				const rows = App.findAll("#headlines-frame > div[id*=RROW][class*=Unread]");

				for (let i = 0; i < rows.length; i++) {
					const row = rows[i];

					if (App.byId("headlines-frame").scrollTop > (row.offsetTop + row.offsetHeight / 2)) {
						row.removeClassName("Unread");
					} else {
						break;
					}
				}
			}

			PluginHost.run(PluginHost.HOOK_HEADLINES_SCROLL_HANDLER);

		} catch (e) {
			console.warn("scrollHandler", e);
		}
	},
	objectById: function (id) {
		return this.headlines[id];
	},
	setCommonClasses: function (headlines_count) {
		const container = App.byId("headlines-frame");

		container.removeClassName("cdm");
		container.removeClassName("normal");

		container.addClassName(App.isCombinedMode() ? "cdm" : "normal");
		container.setAttribute("data-enable-grid", App.getInitParam("cdm_enable_grid") ? "true" : "false");
		container.setAttribute("data-headlines-count", parseInt(headlines_count));
		container.setAttribute("data-is-cdm", App.isCombinedMode() ? "true" : "false");
		container.setAttribute("data-is-cdm-expanded", App.getInitParam("cdm_expanded"));

		// for floating title because it's placed outside of headlines-frame
		App.byId("main").removeClassName("expandable");
		App.byId("main").removeClassName("expanded");

		if (App.isCombinedMode())
			App.byId("main").addClassName(App.getInitParam("cdm_expanded") ? "expanded" : "expandable");
	},
	renderAgain: function () {
		// TODO: wrap headline elements into a knockoutjs model to prevent all this stuff
		Headlines.setCommonClasses(this.headlines.filter((h) => h.id).length);

		App.findAll("#headlines-frame > div[id*=RROW]").forEach((row) => {
			const id = row.getAttribute("data-article-id");
			const hl = this.headlines[id];

			if (hl) {
				const new_row = this.render({}, hl);

				row.parentNode.replaceChild(new_row, row);

				if (hl.active) {
					new_row.addClassName("active");
					Article.unpack(new_row);

					if (App.isCombinedMode())
						Article.cdmMoveToId(id, {noscroll: true});
					else
						Article.view(id);
				}

				if (hl.selected) this.select("all", id);
			}
		});

		App.findAll(".cdm .header-sticky-guard").forEach((e) => {
			this.sticky_header_observer.observe(e)
		});

		App.findAll(".cdm .content").forEach((e) => {
			this.sticky_content_observer.observe(e)
		});

		if (App.getInitParam("cdm_expanded"))
			App.findAll("#headlines-frame > div[id*=RROW].cdm").forEach((e) => {
				this.unpack_observer.observe(e)
			});

		dijit.byId('main').resize();

		PluginHost.run(PluginHost.HOOK_HEADLINES_RENDERED);
	},
	render: function (headlines, hl) {
		let row = null;

		let row_class = "";

		if (hl.marked) row_class += " marked";
		if (hl.published) row_class += " published";
		if (hl.unread) row_class += " Unread";
		if (headlines.vfeed_group_enabled) row_class += " vgrlf";

		if (headlines.vfeed_group_enabled && hl.feed_title && this.vgroup_last_feed != hl.feed_id) {
			const vgrhdr = `<div data-feed-id='${hl.feed_id}' class='feed-title'>
									<div class="pull-right">${Feeds.renderIcon(hl.feed_id, hl.has_icon)}</div>
									<a class="title" href="#" onclick="Feeds.open({feed:${hl.feed_id}})">${hl.feed_title}</a>
									<a class="catchup" title="${__('mark feed as read')}" onclick="Feeds.catchupFeedInGroup(${hl.feed_id})" href="#">
										<i class="icon-done material-icons">done_all</i>
									</a>
								</div>`

			const tmp = document.createElement("div");
			tmp.innerHTML = vgrhdr;

			App.byId("headlines-frame").appendChild(tmp.firstChild);

			this.vgroup_last_feed = hl.feed_id;
		}

		if (App.isCombinedMode()) {
			row_class += App.getInitParam("cdm_expanded") ? " expanded" : " expandable";

			const comments = Article.formatComments(hl);

			row = `<div class="cdm ${row_class} ${Article.getScoreClass(hl.score)}"
						id="RROW-${hl.id}"
						data-article-id="${hl.id}"
						data-orig-feed-id="${hl.feed_id}"
						data-orig-feed-title="${App.escapeHtml(hl.feed_title)}"
						data-is-packed="1"
						data-content="${App.escapeHtml(hl.content)}"
						data-rendered-enclosures="${App.escapeHtml(Article.renderEnclosures(hl.enclosures))}"
						data-score="${hl.score}"
						data-article-title="${App.escapeHtml(hl.title)}"
						onmouseover="Article.mouseIn(${hl.id})"
						onmouseout="Article.mouseOut(${hl.id})">
						<div class="header-sticky-guard"></div>
						<div class="header">
							<div class="left">
								<input dojoType="dijit.form.CheckBox" type="checkbox" onclick="Headlines.onRowChecked(this)" class='rchk'>
								<i class="marked-pic marked-${hl.id} material-icons" onclick="Headlines.toggleMark(${hl.id})">star</i>
								<i class="pub-pic pub-${hl.id} material-icons" onclick="Headlines.togglePub(${hl.id})">rss_feed</i>
							</div>

							<span onclick="return Headlines.click(event, ${hl.id});" data-article-id="${hl.id}" class="titleWrap hlMenuAttach">
								${App.getInitParam("debug_headline_ids") ? `<span class="text-muted small">A: ${hl.id} F: ${hl.feed_id}</span>` : ""}
								<a class="title" title="${App.escapeHtml(hl.title)}" target="_blank" rel="noopener noreferrer" href="${App.escapeHtml(hl.link)}">
									${hl.title}</a>
								<span class="author">${hl.author}</span>
								${Article.renderLabels(hl.id, hl.labels)}
								${hl.cdm_excerpt ? hl.cdm_excerpt : ""}
							</span>

							<a href="#" class="feed vfeedMenuAttach" style="background-color: ${hl.feed_bg_color}" data-feed-id="${hl.feed_id}"
								onclick="Feeds.open({feed:${hl.feed_id}})">${hl.feed_title}</a>

							<span class="updated" title="${hl.imported}">${hl.updated}</span>

							<div class="right">
								<i class="material-icons icon-grid-span" title="${__("Span all columns")}" onclick="Article.cdmToggleGridSpan(${hl.id})">fullscreen</i>
								<i class="material-icons icon-score" title="${hl.score}" onclick="Article.setScore(${hl.id}, this)">${Article.getScorePic(hl.score)}</i>

								<span class="icon-feed" title="${App.escapeHtml(hl.feed_title)}" onclick="Feeds.open({feed:${hl.feed_id}})">
									${Feeds.renderIcon(hl.feed_id, hl.has_icon)}
								</span>
							</div>

						</div>

						<div class="content" onclick="return Headlines.click(event, ${hl.id}, true);">
							${Article.renderNote(hl.id, hl.note)}
							<div class="content-inner" lang="${hl.lang ? hl.lang : 'en'}">
								<div class="text-center text-muted">
									${__("Loading, please wait...")}
								</div>
							</div>

							<!-- intermediate: unstyled, kept for compatibility -->
							<div class="intermediate"></div>

							<div class="footer" onclick="event.stopPropagation()">

								<div class="left">
									${hl.buttons_left}
									<i class="material-icons">label_outline</i>
									${Article.renderTags(hl.id, hl.tags)}
									<a title="${__("Edit tags for this article")}" href="#"
										onclick="Article.editTags(${hl.id})">(+)</a>
									${comments}
								</div>

								<div class="right">
									${hl.buttons}
								</div>
							</div>
						</div>
					</div>`;


		} else {
			row = `<div class="hl ${row_class} ${Article.getScoreClass(hl.score)}"
				id="RROW-${hl.id}"
				data-orig-feed-id="${hl.feed_id}"
				data-orig-feed-title="${App.escapeHtml(hl.feed_title)}"
				data-article-id="${hl.id}"
				data-score="${hl.score}"
				data-article-title="${App.escapeHtml(hl.title)}"
				onmouseover="Article.mouseIn(${hl.id})"
				onmouseout="Article.mouseOut(${hl.id})">
			<div class="left">
				<input dojoType="dijit.form.CheckBox" type="checkbox" onclick="Headlines.onRowChecked(this)" class='rchk'>
					<i class="marked-pic marked-${hl.id} material-icons" onclick="Headlines.toggleMark(${hl.id})">star</i>
					<i class="pub-pic pub-${hl.id} material-icons" onclick="Headlines.togglePub(${hl.id})">rss_feed</i>
			</div>
			<div onclick="return Headlines.click(event, ${hl.id})" class="title">
				${App.getInitParam("debug_headline_ids") ? `<span class="text-muted small">A: ${hl.id} F: ${hl.feed_id}</span>` : ""}
				<span data-article-id="${hl.id}" class="hl-content hlMenuAttach">
					<a class="title" href="${App.escapeHtml(hl.link)}">${hl.title} <span class="preview">${hl.content_preview}</span></a>
					<span class="author">${hl.author}</span>
					${Article.renderLabels(hl.id, hl.labels)}
				</span>
			</div>
			<span class="feed vfeedMenuAttach" data-feed-id="${hl.feed_id}">
				<a style="background : ${hl.feed_bg_color}" href="#" onclick="Feeds.open({feed:${hl.feed_id}})">${hl.feed_title}</a>
			</span>
			<div title="${hl.imported}">
				<span class="updated">${hl.updated}</span>
			</div>
			<div class="right">
				<i class="material-icons icon-score" title="${hl.score}" onclick="Article.setScore(${hl.id}, this)">${Article.getScorePic(hl.score)}</i>
				<span onclick="Feeds.open({feed:${hl.feed_id}})" class="icon-feed" title="${App.escapeHtml(hl.feed_title)}">${Feeds.renderIcon(hl.feed_id, hl.has_icon)}</span>
			</div>
			</div>
		`;
		}

		const tmp = document.createElement("div");
		tmp.innerHTML = row;
		dojo.parser.parse(tmp);

		this.row_observer.observe(tmp.firstChild, {attributes: true});

		PluginHost.run(PluginHost.HOOK_HEADLINE_RENDERED, tmp.firstChild);

		return tmp.firstChild;
	},
	updateCurrentUnread: function () {
		if (App.byId("feed_current_unread")) {
			const feed_unread = Feeds.getUnread(Feeds.getActive(), Feeds.activeIsCat());

			if (feed_unread > 0 && !Element.visible("feeds-holder")) {
				App.byId("feed_current_unread").innerText = feed_unread;
				Element.show("feed_current_unread");
			} else {
				Element.hide("feed_current_unread");
			}
		}
	},
	renderToolbar: function(headlines) {

		const tb = headlines['toolbar'];
		const search_query = Feeds._search_query ? Feeds._search_query.query : "";
		const target = dijit.byId('toolbar-headlines');

		// TODO: is this needed? destroyDescendants() below might take care of it (?)
		if (this._headlinesSelectClickHandle)
			dojo.disconnect(this._headlinesSelectClickHandle);

		target.destroyDescendants();

		if (tb && typeof tb == 'object') {
			target.attr('innerHTML',
			`
				<span class='left'>
					<a href="#" title="${__("Show as feed")}"
						onclick='CommonDialogs.generatedFeed("${headlines.id}", ${headlines.is_cat}, "${App.escapeHtml(search_query)}")'>
						<i class='icon-syndicate material-icons'>rss_feed</i>
					</a>
					${tb.site_url ?
						`<a class="feed_title" target="_blank" href="${App.escapeHtml(tb.site_url)}" title="${tb.last_updated}">${tb.title}</a>`	:
						`<span class="feed_title">${tb.title}</span>`}
					${search_query ?
						`
						<span class='cancel_search'>(<a href='#' onclick='Feeds.cancelSearch()'>${__("Cancel search")}</a>)</span>
						` : ''}
					${tb.error ? `<i title="${App.escapeHtml(tb.error)}" class='material-icons icon-error'>error</i>` : ''}
					<span id='feed_current_unread' style='display: none'></span>
				</span>
				<span class='right'>
					<span id='selected_prompt'></span>

					<select class='select-articles-dropdown'
						id='headlines-select-articles-dropdown'
						data-prevent-value-change="true"
						data-dropdown-skip-first="true"
						dojoType="fox.form.Select"
						title="${__('Show articles')}">
						<option value='' selected="selected">${__("Select...")}</option>
						<option value='headlines_select_all'>${__('All')}</option>
						<option value='headlines_select_unread'>${__('Unread')}</option>
						<option value='headlines_select_invert'>${__('Invert')}</option>
						<option value='headlines_select_none'>${__('None')}</option>
						<option></option>
						<option value='headlines_selectionToggleUnread'>${__('Toggle unread')}</option>
						<option value='headlines_selectionToggleMarked'>${__('Toggle starred')}</option>
						<option value='headlines_selectionTogglePublished'>${__('Toggle published')}</option>
						<option></option>
						<option value='headlines_catchupSelection'>${__('Mark as read')}</option>
						<option value='article_selectionSetScore'>${__('Set score')}</option>
						${tb.plugin_menu_items != '' ?
							`
							<option></option>
							${tb.plugin_menu_items}
						` : ''}
						${headlines.id === 0 && !headlines.is_cat ?
							`
							<option></option>
							<option class='text-error' value='headlines_deleteSelection'>${__('Delete permanently')}</option>
							` : ''}
					</select>

					${tb.plugin_buttons}
				</span>
			`);
		} else {
			target.attr('innerHTML', '');
		}

		dojo.parser.parse(target.domNode);

		this._headlinesSelectClickHandle = dojo.connect(dijit.byId("headlines-select-articles-dropdown"), 'onItemClick',
			(item) => {
				const action = item.option.value;

				switch (action) {
					case 'headlines_select_all':
						Headlines.select('all');
						break;
					case 'headlines_select_unread':
						Headlines.select('unread');
						break;
					case 'headlines_select_invert':
						Headlines.select('invert');
						break;
					case 'headlines_select_none':
						Headlines.select('none');
						break;
					case 'headlines_selectionToggleUnread':
						Headlines.selectionToggleUnread();
						break;
					case 'headlines_selectionToggleMarked':
						Headlines.selectionToggleMarked();
						break;
					case 'headlines_selectionTogglePublished':
						Headlines.selectionTogglePublished();
						break;
					case 'headlines_catchupSelection':
						Headlines.catchupSelection();
						break;
					case 'article_selectionSetScore':
						Article.selectionSetScore();
						break;
					case 'headlines_deleteSelection':
						Headlines.deleteSelection();
						break;
					default:
						if (!PluginHost.run_until(PluginHost.HOOK_HEADLINE_TOOLBAR_SELECT_MENU_ITEM2, true, action))
							console.warn('unknown headlines action', action);
				}
			}
		);
	},
	onLoaded: function (reply, offset, append) {
		console.log("Headlines.onLoaded: offset=", offset, "append=", append);

		let is_cat = false;
		let feed_id = false;

		if (reply) {

			is_cat = reply['headlines']['is_cat'];
			feed_id = reply['headlines']['id'];
			Feeds.last_search_query = reply['headlines']['search_query'];

			if (feed_id != -7 && (feed_id != Feeds.getActive() || is_cat != Feeds.activeIsCat()))
				return;

			const headlines_count = reply['headlines-info']['count'];

			//this.vgroup_last_feed = reply['headlines-info']['vgroup_last_feed'];
			this.current_first_id = reply['headlines']['first_id'];

			console.log('received', headlines_count, 'headlines');

			if (!append) {
				Feeds.infscroll_disabled = parseInt(headlines_count) != 30;
				console.log('infscroll_disabled=', Feeds.infscroll_disabled);

				// also called in renderAgain() after view mode switch
				Headlines.setCommonClasses(headlines_count);

				/** TODO: remove @deprecated */
				App.byId("headlines-frame").setAttribute("is-vfeed",
					reply['headlines']['is_vfeed'] ? 1 : 0);

				App.byId("headlines-frame").setAttribute("data-is-vfeed",
					reply['headlines']['is_vfeed'] ? "true" : "false");

				Article.setActive(0);

				try {
					App.byId("headlines-frame").removeClassName("smooth-scroll");
					App.byId("headlines-frame").scrollTop = 0;
					App.byId("headlines-frame").addClassName("smooth-scroll");
				} catch (e) {
					console.warn(e);
				}

				this.headlines = [];
				this.vgroup_last_feed = undefined;

				/*dojo.html.set(App.byId("toolbar-headlines"),
					reply['headlines']['toolbar'],
					{parseContent: true});*/

				Headlines.renderToolbar(reply['headlines']);

				if (typeof reply['headlines']['content'] == 'string') {
					App.byId("headlines-frame").innerHTML = reply['headlines']['content'];
				} else {
					App.byId("headlines-frame").innerHTML = '';

					for (let i = 0; i < reply['headlines']['content'].length; i++) {
						const hl = reply['headlines']['content'][i];

						App.byId("headlines-frame").appendChild(this.render(reply['headlines'], hl));

						this.headlines[parseInt(hl.id)] = hl;
					}
				}

				let hsp = App.byId("headlines-spacer");

				if (!hsp) {
					hsp = document.createElement("div");
					hsp.id = "headlines-spacer";
				}

				// clear out hsp contents in case there's a power-hungry svg icon rotating there
				hsp.innerHTML = "";

				dijit.byId('headlines-frame').domNode.appendChild(hsp);

				this.initHeadlinesMenu();

				if (Feeds.infscroll_disabled)
					hsp.innerHTML = "<a href='#' onclick='Feeds.openNextUnread()'>" +
						__("Click to open next unread feed.") + "</a>";

				/*
				if (Feeds._search_query) {
					App.byId("feed_title").innerHTML += "<span id='cancel_search'>" +
						" (<a href='#' onclick='Feeds.cancelSearch()'>" + __("Cancel search") + "</a>)" +
						"</span>";
				} */

				Headlines.updateCurrentUnread();

			} else if (headlines_count > 0 && feed_id == Feeds.getActive() && is_cat == Feeds.activeIsCat()) {
				const c = dijit.byId("headlines-frame");

				let hsp = App.byId("headlines-spacer");

				if (hsp)
					c.domNode.removeChild(hsp);

				let headlines_appended = 0;

				if (typeof reply['headlines']['content'] == 'string') {
					App.byId("headlines-frame").innerHTML = reply['headlines']['content'];
				} else {
					for (let i = 0; i < reply['headlines']['content'].length; i++) {
						const hl = reply['headlines']['content'][i];

						if (!this.headlines[parseInt(hl.id)]) {
							App.byId("headlines-frame").appendChild(this.render(reply['headlines'], hl));

							this.headlines[parseInt(hl.id)] = hl;
							++headlines_appended;
						}
					}
				}

				Feeds.infscroll_disabled = headlines_appended == 0;

				console.log('appended', headlines_appended, 'headlines, infscroll_disabled=', Feeds.infscroll_disabled);

				if (!hsp) {
					hsp = document.createElement("div");
					hsp.id = "headlines-spacer";
				}

				// clear out hsp contents in case there's a power-hungry svg icon rotating there
				hsp.innerHTML = "";

				c.domNode.appendChild(hsp);

				this.initHeadlinesMenu();

				if (Feeds.infscroll_disabled) {
					hsp.innerHTML = "<a href='#' onclick='Feeds.openNextUnread()'>" +
						__("Click to open next unread feed.") + "</a>";
				}

			} else {
				Feeds.infscroll_disabled = true;
				const first_id_changed = reply['headlines']['first_id_changed'];

				console.log("no headlines received, infscroll_disabled=", Feeds.infscroll_disabled, 'first_id_changed=', first_id_changed);

				const hsp = App.byId("headlines-spacer");

				if (hsp) {
					if (first_id_changed) {
						hsp.innerHTML = "<a href='#' onclick='Feeds.reloadCurrent()'>" +
							__("New articles found, reload feed to continue.") + "</a>";
					} else {
						hsp.innerHTML = "<a href='#' onclick='Feeds.openNextUnread()'>" +
							__("Click to open next unread feed.") + "</a>";
					}
				}
			}

			App.findAll(".cdm .header-sticky-guard").forEach((e) => {
				this.sticky_header_observer.observe(e)
			});

			App.findAll(".cdm .content").forEach((e) => {
				this.sticky_content_observer.observe(e)
			});

			if (App.getInitParam("cdm_expanded"))
				App.findAll("#headlines-frame > div[id*=RROW].cdm").forEach((e) => {
					this.unpack_observer.observe(e)
				});

		} else {
			dijit.byId("headlines-frame").attr('content', "<div class='whiteBox'>" +
				__('Could not update headlines (invalid object received - see error console for details)') +
				"</div>");
		}

		Feeds.infscroll_in_progress = 0;

		// this is used to auto-catchup articles if needed after infscroll request has finished,
		// unpack visible articles, fill buffer more, etc
		this.scrollHandler();

		dijit.byId('main').resize();

		PluginHost.run(PluginHost.HOOK_HEADLINES_RENDERED);

		Notify.close();
	},
	reverse: function () {
		const toolbar = dijit.byId("toolbar-main");
		let order_by = toolbar.getValues().order_by;

		if (order_by != "date_reverse")
			order_by = "date_reverse";
		else
			order_by = App.getInitParam("default_view_order_by");

		toolbar.setValues({order_by: order_by});
	},
	selectionToggleUnread: function (params = {}) {
		const cmode = params.cmode != undefined ? params.cmode : 2;
		const no_error = params.no_error || false;
		const ids = params.ids || Headlines.getSelected();

		if (ids.length == 0) {
			if (!no_error)
				alert(__("No articles selected."));

			return;
		}

		ids.forEach((id) => {
			const row = App.byId(`RROW-${id}`);

			if (row) {
				switch (cmode) {
					case 0:
						row.removeClassName("Unread");
						break;
					case 1:
						row.addClassName("Unread");
						break;
					case 2:
						row.toggleClassName("Unread");
				}
			}
		});
	},
	selectionToggleMarked: function (ids) {
		ids = ids || Headlines.getSelected();

		if (ids.length == 0) {
			alert(__("No articles selected."));
			return;
		}

		ids.forEach((id) => {
			this.toggleMark(id);
		});
	},
	selectionTogglePublished: function (ids) {
		ids = ids || Headlines.getSelected();

		if (ids.length == 0) {
			alert(__("No articles selected."));
			return;
		}

		ids.forEach((id) => {
			this.togglePub(id);
		});
	},
	toggleMark: function (id) {
		const row = App.byId(`RROW-${id}`);

		if (row)
			row.toggleClassName("marked");

	},
	togglePub: function (id) {
		const row = App.byId(`RROW-${id}`);

		if (row)
			row.toggleClassName("published");
	},
	move: function (mode, params = {}) {
		const no_expand = params.no_expand || false;
		const force_previous = params.force_previous || this.default_force_previous;
		const force_to_top = params.force_to_top || this.default_force_to_top;

		let prev_id = false;
		let next_id = false;
		let current_id = Article.getActive();

		if (!Headlines.isChildVisible(App.byId(`RROW-${current_id}`))) {
			console.log('active article is obscured, resetting to first visible...');
			current_id = Headlines.firstVisible();
			prev_id = current_id;
			next_id = current_id;
		} else {
			const rows = Headlines.getLoaded();

			for (let i = 0; i < rows.length; i++) {
				if (rows[i] == current_id) {

					// Account for adjacent identical article ids.
					if (i > 0) prev_id = rows[i - 1];

					for (let j = i + 1; j < rows.length; j++) {
						if (rows[j] != current_id) {
							next_id = rows[j];
							break;
						}
					}
					break;
				}
			}
		}

		console.log("cur: " + current_id + " next: " + next_id + " prev:" + prev_id);

		if (mode === "next") {
			if (next_id) {
				if (App.isCombinedMode()) {
					window.requestAnimationFrame(() => {
						Article.setActive(next_id);
						Article.cdmMoveToId(next_id, {force_to_top: force_to_top});
					});
				} else {
					Article.view(next_id, no_expand);
				}
			} else if (App.isCombinedMode()) {
				// try to show hsp if no next article exists, in case there's useful information like first_id_changed etc
				const row = App.byId(`RROW-${current_id}`);
				const ctr = App.byId("headlines-frame");

				if (row) {
					const next = row.nextSibling;

					// hsp has half-screen height in auto catchup mode therefore we use its first child (normally A element)
					if (next && Element.visible(next) && next.id == "headlines-spacer" && next.firstChild) {
						const offset = App.byId("headlines-spacer").offsetTop - App.byId("headlines-frame").offsetHeight + next.firstChild.offsetHeight;

						// don't jump back either
						if (ctr.scrollTop < offset)
							ctr.scrollTop = offset;
					}
				}
			}
		} else if (mode === "prev") {
			if (prev_id || current_id) {
				if (App.isCombinedMode()) {
					window.requestAnimationFrame(() => {
						const row = App.byId(`RROW-${current_id}`);
						const ctr = App.byId("headlines-frame");
						const delta_px = Math.round(row.offsetTop) - Math.round(ctr.scrollTop);

						console.log('moving back, delta_px', delta_px);

						if (!force_previous && row && delta_px < -8) {
							Article.setActive(current_id);
							Article.cdmMoveToId(current_id, {force_to_top: force_to_top});
						} else if (prev_id) {
							Article.setActive(prev_id);
							Article.cdmMoveToId(prev_id, {force_to_top: force_to_top});
						}
					});
				} else if (prev_id) {
					Article.view(prev_id, no_expand);
				}
			}
		}
	},
	updateSelectedPrompt: function () {
		const count = Headlines.getSelected().length;
		const elem = App.byId("selected_prompt");

		if (elem) {
			elem.innerHTML = ngettext("%d article selected",
				"%d articles selected", count).replace("%d", count);

			count > 0 ? Element.show(elem) : Element.hide(elem);
		}
	},
	toggleUnread: function (id, cmode) {
		const row = App.byId(`RROW-${id}`);

		if (row) {
			if (typeof cmode == "undefined") cmode = 2;

			switch (cmode) {
				case 0:
					row.removeClassName("Unread");
					break;
				case 1:
					row.addClassName("Unread");
					break;
				case 2:
					row.toggleClassName("Unread");
					break;
			}
		}
	},
	selectionRemoveLabel: function (id, ids) {
		if (!ids) ids = Headlines.getSelected();

		if (ids.length == 0) {
			alert(__("No articles selected."));
			return;
		}

		const query = {
			op: "article", method: "removeFromLabel",
			ids: ids.toString(), lid: id
		};

		xhr.json("backend.php", query, (reply) => {
			this.onLabelsUpdated(reply);
		});
	},
	selectionAssignLabel: function (id, ids) {
		if (!ids) ids = Headlines.getSelected();

		if (ids.length == 0) {
			alert(__("No articles selected."));
			return;
		}

		const query = {
			op: "article", method: "assignToLabel",
			ids: ids.toString(), lid: id
		};

		xhr.json("backend.php", query, (reply) => {
			this.onLabelsUpdated(reply);
		});
	},
	deleteSelection: function () {
		const rows = Headlines.getSelected();

		if (rows.length == 0) {
			alert(__("No articles selected."));
			return;
		}

		const fn = Feeds.getName(Feeds.getActive(), Feeds.activeIsCat());
		let str;

		if (Feeds.getActive() != 0) {
			str = ngettext("Delete %d selected article in %s?", "Delete %d selected articles in %s?", rows.length);
		} else {
			str = ngettext("Delete %d selected article?", "Delete %d selected articles?", rows.length);
		}

		str = str.replace("%d", rows.length);
		str = str.replace("%s", fn);

		if (App.getInitParam("confirm_feed_catchup") && !confirm(str)) {
			return;
		}

		const query = {op: "rpc", method: "delete", ids: rows.toString()};

		xhr.json("backend.php", query, () => {
			Feeds.reloadCurrent();
		});
	},
	getSelected: function () {
		const rv = [];

		App.findAll("#headlines-frame > div[id*=RROW][class*=Selected]").forEach(
			function (child) {
				rv.push(child.getAttribute("data-article-id"));
			});

		// consider active article a honorary member of selected articles
		if (Article.getActive())
			rv.push(Article.getActive());

		return rv.uniq();
	},
	getLoaded: function () {
		const rv = [];

		const children = App.findAll("#headlines-frame > div[id*=RROW-]");

		children.forEach(function (child) {
			if (Element.visible(child)) {
				rv.push(child.getAttribute("data-article-id"));
			}
		});

		return rv;
	},
	onRowChecked: function (elem) {
		const row = elem.domNode.closest("div[id*=RROW]");

		// do not allow unchecking active article checkbox
		if (row.hasClassName("active")) {
			elem.attr("checked", 1);
			return;
		}

		if (elem.attr("checked")) {
			row.addClassName("Selected");
		} else {
			row.removeClassName("Selected");
		}
	},
	getRange: function (start, stop) {
		if (start == stop)
			return [start];

		const rows = App.findAll("#headlines-frame > div[id*=RROW]");
		const results = [];
		let collecting = false;

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const id = row.getAttribute('data-article-id');

			if (id == start || id == stop) {
				if (!collecting) {
					collecting = true;
				} else {
					results.push(id);
					break;
				}
			}

			if (collecting)
				results.push(id);
		}

		return results;
	},
	select: function (mode, articleId) {
		// mode = all,none,unread,invert,marked,published
		let query = "#headlines-frame > div[id*=RROW]";

		if (articleId) query += `[data-article-id="${articleId}"]`;

		switch (mode) {
			case "none":
			case "all":
			case "invert":
				break;
			case "marked":
				query += "[class*=marked]";
				break;
			case "published":
				query += "[class*=published]";
				break;
			case "unread":
				query += "[class*=Unread]";
				break;
			default:
				console.warn("select: unknown mode", mode);
		}

		App.findAll(query).forEach((row) => {

			switch (mode) {
				case "none":
					row.removeClassName("Selected");
					break;
				case "invert":
					row.toggleClassName("Selected");
					break;
				default:
					row.addClassName("Selected");
			}
		});
	},
	catchupSelection: function () {
		const rows = Headlines.getSelected();

		if (rows.length == 0) {
			alert(__("No articles selected."));
			return;
		}

		const fn = Feeds.getName(Feeds.getActive(), Feeds.activeIsCat());

		let str = ngettext("Mark %d selected article in %s as read?", "Mark %d selected articles in %s as read?", rows.length);

		str = str.replace("%d", rows.length);
		str = str.replace("%s", fn);

		if (App.getInitParam("confirm_feed_catchup") && !confirm(str)) {
			return;
		}

		Headlines.selectionToggleUnread({ids: rows, cmode: 0});
	},
	catchupRelativeTo: function (below, id) {

		if (!id) id = Article.getActive();

		if (!id) {
			alert(__("No article is selected."));
			return;
		}

		const visible_ids = this.getLoaded();

		const ids_to_mark = [];

		if (!below) {
			for (let i = 0; i < visible_ids.length; i++) {
				if (visible_ids[i] != id) {
					const e = App.byId(`RROW-${visible_ids[i]}`);

					if (e && e.hasClassName("Unread")) {
						ids_to_mark.push(visible_ids[i]);
					}
				} else {
					break;
				}
			}
		} else {
			for (let i = visible_ids.length - 1; i >= 0; i--) {
				if (visible_ids[i] != id) {
					const e = App.byId(`RROW-${visible_ids[i]}`);

					if (e && e.hasClassName("Unread")) {
						ids_to_mark.push(visible_ids[i]);
					}
				} else {
					break;
				}
			}
		}

		if (ids_to_mark.length == 0) {
			alert(__("No articles found to mark"));
		} else {
			const msg = ngettext("Mark %d article as read?", "Mark %d articles as read?", ids_to_mark.length).replace("%d", ids_to_mark.length);

			if (App.getInitParam("confirm_feed_catchup") != 1 || confirm(msg)) {

				for (let i = 0; i < ids_to_mark.length; i++) {
					const e = App.byId(`RROW-${ids_to_mark[i]}`);
					e.removeClassName("Unread");
				}
			}
		}
	},
	onTagsUpdated: function (data) {
		if (data) {
			if (this.headlines[data.id]) {
				this.headlines[data.id].tags = data.tags;
			}

			App.findAll(`span[data-tags-for="${data.id}"`).forEach((ctr) => {
				ctr.innerHTML = Article.renderTags(data.id, data.tags);
			});
		}
	},
	// TODO: maybe this should cause article to be rendered again, although it might cause flicker etc
	onLabelsUpdated: function (data) {
		if (data) {
			data["labels-for"].forEach((row) => {
				if (this.headlines[row.id]) {
					this.headlines[row.id].labels = row.labels;
				}

				App.findAll(`span[data-labels-for="${row.id}"]`).forEach((ctr) => {
					ctr.innerHTML = Article.renderLabels(row.id, row.labels);
				});
			});
		}
	},
	scrollToArticleId: function (id) {
		const container = App.byId("headlines-frame");
		const row = App.byId(`RROW-${id}`);

		if (!container || !row) return;

		const viewport = container.offsetHeight;

		const rel_offset_top = row.offsetTop - container.scrollTop;
		const rel_offset_bottom = row.offsetTop + row.offsetHeight - container.scrollTop;

		//console.log("Rtop: " + rel_offset_top + " Rbtm: " + rel_offset_bottom);
		//console.log("Vport: " + viewport);

		if (rel_offset_top <= 0 || rel_offset_top > viewport) {
			container.scrollTop = row.offsetTop;
		} else if (rel_offset_bottom > viewport) {
			container.scrollTop = row.offsetTop + row.offsetHeight - viewport;
		}
	},
	headlinesMenuCommon: function (menu) {

		menu.addChild(new dijit.MenuItem({
			label: __("Open original article"),
			onClick: function (/* event */) {
				Article.openInNewWindow(this.getParent().currentTarget.getAttribute("data-article-id"));
			}
		}));

		menu.addChild(new dijit.MenuItem({
			label: __("Display article URL"),
			onClick: function (/* event */) {
				Article.displayUrl(this.getParent().currentTarget.getAttribute("data-article-id"));
			}
		}));

		menu.addChild(new dijit.MenuSeparator());

		menu.addChild(new dijit.MenuItem({
			label: __("Toggle unread"),
			onClick: function () {

				let ids = Headlines.getSelected();
				// cast to string
				const id = (this.getParent().currentTarget.getAttribute("data-article-id")) + "";
				ids = ids.length != 0 && ids.indexOf(id) != -1 ? ids : [id];

				Headlines.selectionToggleUnread({ids: ids, no_error: 1});
			}
		}));

		menu.addChild(new dijit.MenuItem({
			label: __("Toggle starred"),
			onClick: function () {
				let ids = Headlines.getSelected();
				// cast to string
				const id = (this.getParent().currentTarget.getAttribute("data-article-id")) + "";
				ids = ids.length != 0 && ids.indexOf(id) != -1 ? ids : [id];

				Headlines.selectionToggleMarked(ids);
			}
		}));

		menu.addChild(new dijit.MenuItem({
			label: __("Toggle published"),
			onClick: function () {
				let ids = Headlines.getSelected();
				// cast to string
				const id = (this.getParent().currentTarget.getAttribute("data-article-id")) + "";
				ids = ids.length != 0 && ids.indexOf(id) != -1 ? ids : [id];

				Headlines.selectionTogglePublished(ids);
			}
		}));

		menu.addChild(new dijit.MenuSeparator());

		menu.addChild(new dijit.MenuItem({
			label: __("Mark above as read"),
			onClick: function () {
				Headlines.catchupRelativeTo(0, this.getParent().currentTarget.getAttribute("data-article-id"));
			}
		}));

		menu.addChild(new dijit.MenuItem({
			label: __("Mark below as read"),
			onClick: function () {
				Headlines.catchupRelativeTo(1, this.getParent().currentTarget.getAttribute("data-article-id"));
			}
		}));


		const labels = App.getInitParam("labels");

		if (labels && labels.length) {

			menu.addChild(new dijit.MenuSeparator());

			const labelAddMenu = new dijit.Menu({ownerMenu: menu});
			const labelDelMenu = new dijit.Menu({ownerMenu: menu});

			labels.forEach(function (label) {
				const bare_id = label.id;
				const name = label.caption;

				labelAddMenu.addChild(new dijit.MenuItem({
					label: name,
					labelId: bare_id,
					onClick: function () {

						let ids = Headlines.getSelected();
						// cast to string
						const id = (this.getParent().ownerMenu.currentTarget.getAttribute("data-article-id")) + "";

						ids = ids.length != 0 && ids.indexOf(id) != -1 ? ids : [id];

						Headlines.selectionAssignLabel(this.labelId, ids);
					}
				}));

				labelDelMenu.addChild(new dijit.MenuItem({
					label: name,
					labelId: bare_id,
					onClick: function () {
						let ids = Headlines.getSelected();
						// cast to string
						const id = (this.getParent().ownerMenu.currentTarget.getAttribute("data-article-id")) + "";

						ids = ids.length != 0 && ids.indexOf(id) != -1 ? ids : [id];

						Headlines.selectionRemoveLabel(this.labelId, ids);
					}
				}));

			});

			menu.addChild(new dijit.PopupMenuItem({
				label: __("Assign label"),
				popup: labelAddMenu
			}));

			menu.addChild(new dijit.PopupMenuItem({
				label: __("Remove label"),
				popup: labelDelMenu
			}));

		}
	},
	scrollByPages: function (page_offset) {
		App.Scrollable.scrollByPages(App.byId("headlines-frame"), page_offset);
	},
	scroll: function (offset) {
		App.Scrollable.scroll(App.byId("headlines-frame"), offset);
	},
	initHeadlinesMenu: function () {
		if (!dijit.byId("headlinesMenu")) {

			const menu = new dijit.Menu({
				id: "headlinesMenu",
				targetNodeIds: ["headlines-frame"],
				selector: ".hlMenuAttach"
			});

			this.headlinesMenuCommon(menu);

			menu.startup();
		}

		/* vfeed menu */

		if (!dijit.byId("vfeedMenu")) {

			const menu = new dijit.Menu({
				id: "vfeedMenu",
				targetNodeIds: ["headlines-frame"],
				selector: ".vfeedMenuAttach"
			});

			menu.addChild(new dijit.MenuItem({
				label: __("Mark as read"),
				onClick: function() {
					Feeds.catchupFeed(this.getParent().currentTarget.getAttribute("data-feed-id"));
				}}));

			menu.addChild(new dijit.MenuItem({
				label: __("Edit feed"),
				onClick: function() {
					CommonDialogs.editFeed(this.getParent().currentTarget.getAttribute("data-feed-id"), false);
				}}));

			menu.addChild(new dijit.MenuItem({
				label: __("Open site"),
				onClick: function() {
					App.postOpenWindow("backend.php", {op: "feeds", method: "opensite",
						feed_id: this.getParent().currentTarget.getAttribute("data-feed-id"), csrf_token: __csrf_token});
				}}));

			menu.addChild(new dijit.MenuSeparator());

			menu.addChild(new dijit.MenuItem({
				label: __("Debug feed"),
				onClick: function() {
					/* global __csrf_token */
					App.postOpenWindow("backend.php", {op: "feeds", method: "updatedebugger",
						feed_id: this.getParent().currentTarget.getAttribute("data-feed-id"), csrf_token: __csrf_token});
				}}));

			menu.startup();
		}

		/* vgroup feed title menu */

		if (!dijit.byId("headlinesFeedTitleMenu")) {

			const menu = new dijit.Menu({
				id: "headlinesFeedTitleMenu",
				targetNodeIds: ["headlines-frame"],
				selector: "div.cdmFeedTitle"
			});

			menu.addChild(new dijit.MenuItem({
				label: __("Select articles in group"),
				onClick: function (/* event */) {
					Headlines.select("all",
						"#headlines-frame > div[id*=RROW]" +
						"[data-orig-feed-id='" + this.getParent().currentTarget.getAttribute("data-feed-id") + "']");

				}
			}));

			menu.addChild(new dijit.MenuItem({
				label: __("Mark group as read"),
				onClick: function () {
					Headlines.select("none");
					Headlines.select("all",
						"#headlines-frame > div[id*=RROW]" +
						"[data-orig-feed-id='" + this.getParent().currentTarget.getAttribute("data-feed-id") + "']");

					Headlines.catchupSelection();
				}
			}));

			menu.addChild(new dijit.MenuItem({
				label: __("Mark feed as read"),
				onClick: function () {
					Feeds.catchupFeedInGroup(this.getParent().currentTarget.getAttribute("data-feed-id"));
				}
			}));

			menu.addChild(new dijit.MenuItem({
				label: __("Edit feed"),
				onClick: function () {
					CommonDialogs.editFeed(this.getParent().currentTarget.getAttribute("data-feed-id"));
				}
			}));

			menu.startup();
		}
	}
}
