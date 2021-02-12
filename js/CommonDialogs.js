'use strict'

/* global __, ngettext, dojo, dijit, Notify, App, Feeds, $$, xhrPost, xhrJson, Tables, Effect, fox */

/* exported CommonDialogs */
const	CommonDialogs = {
		closeInfoBox: function() {
			const dialog = dijit.byId("infoBox");
			if (dialog)	dialog.hide();
		},
		removeFeedIcon: function(id) {
			if (confirm(__("Remove stored feed icon?"))) {
				Notify.progress("Removing feed icon...", true);

				const query = {op: "pref-feeds", method: "removeicon", feed_id: id};

				xhrPost("backend.php", query, () => {
					Notify.info("Feed icon removed.");

					if (App.isPrefs())
						dijit.byId("feedTree").reload();
					else
						Feeds.reload();

					const icon = $$(".feed-editor-icon")[0];

					if (icon)
						icon.src = icon.src.replace(/\?[0-9]+$/, "?" + new Date().getTime());

				});
			}

			return false;
		},
		uploadFeedIcon: function() {
			const file = $("icon_file");

			if (file.value.length == 0) {
				alert(__("Please select an image file to upload."));
			} else if (confirm(__("Upload new icon for this feed?"))) {
				Notify.progress("Uploading, please wait...", true);

				const xhr = new XMLHttpRequest();

				xhr.open( 'POST', 'backend.php', true );
				xhr.onload = function () {
					switch (parseInt(this.responseText)) {
						case 0:
							{
								Notify.info("Upload complete.");

								if (App.isPrefs())
									dijit.byId("feedTree").reload();
								else
									Feeds.reload();

								const icon = $$(".feed-editor-icon")[0];

								if (icon)
									icon.src = icon.src.replace(/\?[0-9]+$/, "?" + new Date().getTime());

							}
							break;
						case 1:
							Notify.error("Upload failed: icon is too big.");
							break;
						case 2:
							Notify.error("Upload failed.");
							break;
					}
				};
				xhr.send(new FormData($("feed_icon_upload_form")));
			}

			return false;
		},
		quickAddFeed: function() {
			xhrPost("backend.php",
					{op: "feeds", method: "quickAddFeed"},
					(transport) => {

						const dialog = new fox.SingleUseDialog({
							id: "feedAddDlg",
							title: __("Subscribe to Feed"),
							content: transport.responseText,
							show_error: function (msg) {
								const elem = $("fadd_error_message");

								elem.innerHTML = msg;

								if (!Element.visible(elem))
									new Effect.Appear(elem);

							},
							execute: function () {
								if (this.validate()) {
									console.log(dojo.objectToQuery(this.attr('value')));

									const feed_url = this.attr('value').feed;

									Element.show("feed_add_spinner");
									Element.hide("fadd_error_message");

									xhrPost("backend.php", this.attr('value'), (transport) => {
										try {

											let reply;

											try {
												reply = JSON.parse(transport.responseText);
											} catch (e) {
												Element.hide("feed_add_spinner");
												alert(__("Failed to parse output. This can indicate server timeout and/or network issues. Backend output was logged to browser console."));
												console.log('quickAddFeed, backend returned:' + transport.responseText);
												return;
											}

											const rc = reply['result'];

											Notify.close();
											Element.hide("feed_add_spinner");

											console.log(rc);

											switch (parseInt(rc['code'])) {
												case 1:
													dialog.hide();
													Notify.info(__("Subscribed to %s").replace("%s", feed_url));

													if (App.isPrefs())
														dijit.byId("feedTree").reload();
													else
														Feeds.reload();

													break;
												case 2:
													dialog.show_error(__("Specified URL seems to be invalid."));
													break;
												case 3:
													dialog.show_error(__("Specified URL doesn't seem to contain any feeds."));
													break;
												case 4:
													{
														const feeds = rc['feeds'];

														Element.show("fadd_multiple_notify");

														const select = dijit.byId("feedDlg_feedContainerSelect");

														while (select.getOptions().length > 0)
															select.removeOption(0);

														select.addOption({value: '', label: __("Expand to select feed")});

														for (const feedUrl in feeds) {
															if (feeds.hasOwnProperty(feedUrl)) {
																select.addOption({value: feedUrl, label: feeds[feedUrl]});
															}
														}

														Effect.Appear('feedDlg_feedsContainer', {duration: 0.5});
													}
													break;
												case 5:
													dialog.show_error(__("Couldn't download the specified URL: %s").replace("%s", rc['message']));
													break;
												case 6:
													dialog.show_error(__("XML validation failed: %s").replace("%s", rc['message']));
													break;
												case 0:
													dialog.show_error(__("You are already subscribed to this feed."));
													break;
											}

										} catch (e) {
											console.error(transport.responseText);
											App.Error.report(e);
										}
									});
								}
							},
						});

						dialog.show();
					});
		},
		showFeedsWithErrors: function() {
			const query = {op: "pref-feeds", method: "feedsWithErrors"};

			const dialog = new fox.SingleUseDialog({
				id: "errorFeedsDlg",
				title: __("Feeds with update errors"),
				getSelectedFeeds: function () {
					return Tables.getSelected("error-feeds-list");
				},
				removeSelected: function () {
					const sel_rows = this.getSelectedFeeds();

					if (sel_rows.length > 0) {
						if (confirm(__("Remove selected feeds?"))) {
							Notify.progress("Removing selected feeds...", true);

							const query = {
								op: "pref-feeds", method: "remove",
								ids: sel_rows.toString()
							};

							xhrPost("backend.php", query, () => {
								Notify.close();
								dialog.hide();

								if (App.isPrefs())
									dijit.byId("feedTree").reload();
								else
									Feeds.reload();

							});
						}

					} else {
						alert(__("No feeds selected."));
					}
				},
				execute: function () {
					if (this.validate()) {
						//
					}
				},
				href: "backend.php?" + dojo.objectToQuery(query)
			});

			dialog.show();
		},
		addLabel: function(select, callback) {
			const caption = prompt(__("Please enter label caption:"), "");

			if (caption != undefined && caption.trim().length > 0) {

				const query = {op: "pref-labels", method: "add", caption: caption.trim()};

				if (select)
					Object.extend(query, {output: "select"});

				Notify.progress("Loading, please wait...", true);

				xhrPost("backend.php", query, (transport) => {
					if (callback) {
						callback(transport);
					} else if (App.isPrefs()) {
						dijit.byId("labelTree").reload();
					} else {
						Feeds.reload();
					}
				});
			}
		},
		unsubscribeFeed: function(feed_id, title) {

			const msg = __("Unsubscribe from %s?").replace("%s", title);

			if (typeof title == "undefined" || confirm(msg)) {
				Notify.progress("Removing feed...");

				const query = {op: "pref-feeds", quiet: 1, method: "remove", ids: feed_id};

				xhrPost("backend.php", query, () => {
					if (dijit.byId("feedEditDlg")) dijit.byId("feedEditDlg").hide();

					if (App.isPrefs()) {
						dijit.byId("feedTree").reload();
					} else {
						if (feed_id == Feeds.getActive())
							setTimeout(() => {
									Feeds.open({feed: -5})
								},
								100);

						if (feed_id < 0) Feeds.reload();
					}
				});
			}

			return false;
		},
		editFeed: function (feed) {
			if (feed <= 0)
				return alert(__("You can't edit this kind of feed."));

			const query = {op: "pref-feeds", method: "editfeed", id: feed};

			console.log("editFeed", query);

			const dialog = new fox.SingleUseDialog({
				id: "feedEditDlg",
				title: __("Edit Feed"),
				execute: function () {
					if (this.validate()) {
						Notify.progress("Saving data...", true);

						xhrPost("backend.php", dialog.attr('value'), () => {
							dialog.hide();
							Notify.close();

							if (App.isPrefs())
								dijit.byId("feedTree") && dijit.byId("feedTree").reload();
							else
								Feeds.reload();

						});
					}
				},
				href: "backend.php?" + dojo.objectToQuery(query)
			});

			dialog.show();
		},
		genUrlChangeKey: function(feed, is_cat) {
			if (confirm(__("Generate new syndication address for this feed?"))) {

				Notify.progress("Trying to change address...", true);

				const query = {op: "pref-feeds", method: "regenFeedKey", id: feed, is_cat: is_cat};

				xhrJson("backend.php", query, (reply) => {
					const new_link = reply.link;
					const e = $('gen_feed_url');

					if (new_link) {
						e.innerHTML = e.innerHTML.replace(/&amp;key=.*$/,
							"&amp;key=" + new_link);

						e.href = e.href.replace(/&key=.*$/,
							"&key=" + new_link);

						new Effect.Highlight(e);

						Notify.close();

					} else {
						Notify.error("Could not change feed URL.");
					}
				});
			}
			return false;
		},
		publishedOPML: function() {

			Notify.progress("Loading, please wait...", true);

			xhrJson("backend.php", {op: "pref-feeds", method: "getOPMLKey"}, (reply) => {
				try {
					const dialog = new fox.SingleUseDialog({
						title: __("Public OPML URL"),
						id: 'publicOPMLDlg',
						onCancel: function () {
							return true;
						},
						onExecute: function () {
							return true;
						},
						onClose: function () {
							return true;
						},
						content: `
							<header>${__("Your Public OPML URL is:")}</header>
							<section>
								<div class='panel text-center'>
									<a id='pub_opml_url' href="${App.escapeHtml(reply.link)}" target='_blank'>${reply.link}</a>
								</div>
							</section>
							<footer class='text-center'>
								<button dojoType='dijit.form.Button' onclick="return Helpers.OPML.changeKey()">
									${__('Generate new URL')}
								</button>
								<button dojoType='dijit.form.Button' type='submit' class='alt-primary'>
									${__('Close this window')}
								</button>
							</footer>
						`
					});

					dialog.show();

					Notify.close();

				} catch (e) {
					this.Error.report(e);
				}
			});
		},
		generatedFeed: function(feed, is_cat, rss_url) {

			Notify.progress("Loading, please wait...", true);

			xhrJson("backend.php", {op: "pref-feeds", method: "getFeedKey", id: feed, is_cat: is_cat}, (reply) => {
				try {
					const feed_title = Feeds.getName(feed, is_cat);
					const secret_url = rss_url + "&key=" + encodeURIComponent(reply.link);

					const dialog = new fox.SingleUseDialog({
						title: __("Show as feed"),
						id: 'genFeedDlg',
						onCancel: function () {
							return true;
						},
						onExecute: function () {
							return true;
						},
						onClose: function () {
							return true;
						},
						content: `
							<header>${__("%s can be accessed via the following secret URL:").replace("%s", feed_title)}</header>
							<section>
								<div class='panel text-center'>
									<a id='gen_feed_url' href="${App.escapeHtml(secret_url)}" target='_blank'>${secret_url}</a>
								</div>
							</section>
							<footer>
								<button dojoType='dijit.form.Button' style='float : left' class='alt-info'
									onclick='window.open("https://tt-rss.org/wiki/GeneratedFeeds")'>
									<i class='material-icons'>help</i> ${__("More info...")}</button>
								<button dojoType='dijit.form.Button' onclick="return CommonDialogs.genUrlChangeKey('${feed}', '${is_cat}')">
									${__('Generate new URL')}
								</button>
								<button dojoType='dijit.form.Button' class='alt-primary' type='submit'>
									${__('Close this window')}
								</button>
							</footer>
						`
					});

					dialog.show();

					Notify.close();

				} catch (e) {
					this.Error.report(e);
				}
			});
		},
	};
