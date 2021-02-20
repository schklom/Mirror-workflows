'use strict'

/* eslint-disable new-cap */
/* eslint-disable no-new */

/* global __, dojo, dijit, Notify, App, Feeds, xhrPost, xhr, Tables, fox */

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

				xhr.post("backend.php", query, () => {
					Notify.info("Feed icon removed.");

					if (App.isPrefs())
						dijit.byId("feedTree").reload();
					else
						Feeds.reload();

					const icon = App.findAll(".feed-editor-icon")[0];

					if (icon)
						icon.src = icon.src.replace(/\?[0-9]+$/, "?" + new Date().getTime());

				});
			}

			return false;
		},
		uploadFeedIcon: function() {
			const file = App.byId("icon_file");

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

								const icon = App.findAll(".feed-editor-icon")[0];

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
				xhr.send(new FormData(App.byId("feed_icon_upload_form")));
			}

			return false;
		},
		subscribeToFeed: function() {
			xhr.json("backend.php",
					{op: "feeds", method: "subscribeToFeed"},
					(reply) => {
						const dialog = new fox.SingleUseDialog({
							title: __("Subscribe to Feed"),
							content: `
								<form onsubmit='return false'>

									${App.FormFields.hidden_tag("op", "feeds")}
									${App.FormFields.hidden_tag("method", "add")}

									<div id='fadd_error_message' style='display : none' class='alert alert-danger'></div>

									<div id='fadd_multiple_notify' style='display : none'>
										<div class='alert alert-info'>
											${__("Provided URL is a HTML page referencing multiple feeds, please select required feed from the dropdown menu below.")}
										</div>
									</div>

									<section>
										<fieldset>
											<div style='float : right'><img style='display : none' id='feed_add_spinner' src='images/indicator_white.gif'></div>
											<input style='font-size : 16px; width : 500px;'
												placeHolder="${__("Feed or site URL")}"
												dojoType='dijit.form.ValidationTextBox'
												required='1' name='feed' id='feedDlg_feedUrl'>
										</fieldset>

										${App.getInitParam('enable_feed_cats') ?
										`
											<fieldset>
												<label class='inline'>${__('Place in category:')}</label>
												${reply.cat_select}
											</fieldset>
										` : ''}
									</section>

									<div id="feedDlg_feedsContainer" style="display : none">
										<header>${__('Available feeds')}</header>
										<section>
											<fieldset>
												<select id="feedDlg_feedContainerSelect"
													dojoType="fox.form.Select" size="3">
													<script type="dojo/method" event="onChange" args="value">
														dijit.byId("feedDlg_feedUrl").attr("value", value);
													</script>
												</select>
											</fieldset>
										</section>
									</div>

									<div id='feedDlg_loginContainer' style='display : none'>
										<section>
											<fieldset>
												<input dojoType="dijit.form.TextBox" name='login'"
													placeHolder="${__("Login")}"
													autocomplete="new-password"
													style="width : 10em;">
												<input
													placeHolder="${__("Password")}"
													dojoType="dijit.form.TextBox" type='password'
													autocomplete="new-password"
													style="width : 10em;" name='pass'">
											</fieldset>
										</section>
									</div>

									<section>
										<label class='checkbox'>
											<input type='checkbox' name='need_auth' dojoType='dijit.form.CheckBox' id='feedDlg_loginCheck'
														onclick='App.displayIfChecked(this, "feedDlg_loginContainer")'>
													${__('This feed requires authentication.')}
										</label>
									</section>

									<footer>
										<button dojoType='dijit.form.Button' class='alt-primary' type='submit'
											onclick='App.dialogOf(this).execute()'>
											${__('Subscribe')}
										</button>
										<button dojoType='dijit.form.Button' onclick='App.dialogOf(this).hide()'>
											${__('Cancel')}
										</button>
									</footer>
								</form>
							`,
							show_error: function (msg) {
								const elem = App.byId("fadd_error_message");

								elem.innerHTML = msg;

								Element.show(elem);
							},
							execute: function () {
								if (this.validate()) {
									console.log(dojo.objectToQuery(this.attr('value')));

									const feed_url = this.attr('value').feed;

									Element.show("feed_add_spinner");
									Element.hide("fadd_error_message");

									xhr.json("backend.php", this.attr('value'), (reply) => {
										try {

											if (!reply) {
												Element.hide("feed_add_spinner");
												alert(__("Failed to parse output. This can indicate server timeout and/or network issues. Backend output was logged to browser console."));
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

														Element.show('feedDlg_feedsContainer');
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

			xhr.json("backend.php", {op: "pref-feeds", method: "feedsWithErrors"}, (reply) => {

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

								xhr.post("backend.php", query, () => {
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
					content: `
						<div dojoType="fox.Toolbar">
							<div dojoType="fox.form.DropDownButton">
								<span>${__('Select')}</span>
								<div dojoType="dijit.Menu" style="display: none">
									<div onclick="Tables.select('error-feeds-list', true)"
										dojoType="dijit.MenuItem">${__('All')}</div>
									<div onclick="Tables.select('error-feeds-list', false)"
										dojoType="dijit.MenuItem">${__('None')}</div>
								</div>
							</div>
						</div>

						<div class='panel panel-scrollable'>
							<table width='100%' id='error-feeds-list'>

							${reply.map((row) => `
								<tr data-row-id='${row.id}'>
									<td width='5%' align='center'>
										<input onclick='Tables.onRowChecked(this)' dojoType="dijit.form.CheckBox"
											type="checkbox">
									</td>
									<td>
										<a href="#" title="${__("Click to edit feed")}" onclick="CommonDialogs.editFeed(${row.id})">
											${App.escapeHtml(row.title)}
										</a>
									</td>
									<td class='text-muted small' align='right' width='50%'>
											${App.escapeHtml(row.last_error)}
									</td>
									</tr>
							`).join("")}
							</table>
						</div>

						<footer>
							<button style='float : left' class='alt-danger' dojoType='dijit.form.Button' onclick='App.dialogOf(this).removeSelected()'>
								${__('Unsubscribe from selected feeds')}
							</button>
							<button dojoType='dijit.form.Button' class='alt-primary' type='submit'>
								${__('Close this window')}
							</button>
						</footer>
					`
				});

				dialog.show();
			})
		},
		addLabel: function() {
			const caption = prompt(__("Please enter label caption:"), "");

			if (caption != undefined && caption.trim().length > 0) {

				const query = {op: "pref-labels", method: "add", caption: caption.trim()};

				Notify.progress("Loading, please wait...", true);

				xhr.post("backend.php", query, () => {
					if (dijit.byId("labelTree")) {
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

				xhr.post("backend.php", query, () => {
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
		editFeed: function (feed_id) {
			if (feed_id <= 0)
				return alert(__("You can't edit this kind of feed."));

			const query = {op: "pref-feeds", method: "editfeed", id: feed_id};

			console.log("editFeed", query);

			const dialog = new fox.SingleUseDialog({
				id: "feedEditDlg",
				title: __("Edit Feed"),
				feed_title: "",
				unsubscribe: function() {
					if (confirm(__("Unsubscribe from %s?").replace("%s", this.feed_title))) {
						dialog.hide();
						CommonDialogs.unsubscribeFeed(feed_id);
               }
				},
				execute: function () {
					if (this.validate()) {
						Notify.progress("Saving data...", true);

						xhr.post("backend.php", dialog.attr('value'), () => {
							dialog.hide();
							Notify.close();

							if (App.isPrefs())
								dijit.byId("feedTree") && dijit.byId("feedTree").reload();
							else
								Feeds.reload();

						});
						return true;
					}
					return false;
				},
				content: __("Loading, please wait...")
			});

			const tmph = dojo.connect(dialog, 'onShow', function () {
				dojo.disconnect(tmph);

				xhr.json("backend.php", {op: "pref-feeds", method: "editfeed", id: feed_id}, (reply) => {
					const feed = reply.feed;

					// for unsub prompt
					dialog.feed_title = feed.title;

					dialog.attr('content',
					`
					<div dojoType="dijit.layout.TabContainer" style="height : 450px">
						<div dojoType="dijit.layout.ContentPane" title="${__('General')}">

							${App.FormFields.hidden_tag("id", feed_id)}
							${App.FormFields.hidden_tag("op", "pref-feeds")}
							${App.FormFields.hidden_tag("method", "editSave")}

							<section>
								<fieldset>
									<input dojoType='dijit.form.ValidationTextBox' required='1'
										placeHolder="${__("Feed Title")}"
										style='font-size : 16px; width: 500px' name='title' value="${App.escapeHtml(feed.title)}">
								</fieldset>

								<fieldset>
									<label>${__('URL:')}</label>
									<input dojoType='dijit.form.ValidationTextBox' required='1'
										placeHolder="${__("Feed URL")}"
										regExp='^(http|https)://.*' style='width : 300px'
										name='feed_url' value="${App.escapeHtml(feed.feed_url)}">

									${feed.last_error ?
										`<i class="material-icons"
											title="${App.escapeHtml(feed.last_error)}">error</i>
										` : ""}
								</fieldset>

								${reply.cats.enabled ?
									`
									<fieldset>
										<label>${__('Place in category:')}</label>
										${reply.cats.select}
									</fieldset>
									` : ""}

								<fieldset>
									<label>${__('Site URL:')}</label>
									<input dojoType='dijit.form.ValidationTextBox' required='1'
										placeHolder="${__("Site URL")}"
										regExp='^(http|https)://.*' style='width : 300px'
										name='site_url' value="${App.escapeHtml(feed.site_url)}">
								</fieldset>

								${reply.lang.enabled ?
									`
									<fieldset>
										<label>${__('Language:')}</label>
										${App.FormFields.select_tag("feed_language", feed.feed_language, reply.lang.all)}
									</fieldset>
									` : ""}

								<hr/>

								<fieldset>
									<label>${__("Update interval:")}</label>
									${App.FormFields.select_hash("update_interval", feed.update_interval, reply.intervals.update)}
								</fieldset>
								<fieldset>
									<label>${__('Article purging:')}</label>

									${App.FormFields.select_hash("purge_interval",
																feed.purge_interval,
																reply.intervals.purge,
																reply.force_purge ? {disabled: 1} : {})}

								</fieldset>
							</section>
						</div>
						<div dojoType="dijit.layout.ContentPane" title="${__('Authentication')}">
							<section>
								<fieldset>
									<label>${__("Login:")}</label>
									<input dojoType='dijit.form.TextBox'
										autocomplete='new-password'
										name='auth_login' value="${App.escapeHtml(feed.auth_login)}">
								</fieldset>
								<fieldset>
								<label>${__("Password:")}</label>
									<input dojoType='dijit.form.TextBox' type='password' name='auth_pass'
										autocomplete='new-password'
										value="${App.escapeHtml(feed.auth_pass)}">
								</fieldset>
							</section>
						</div>
						<div dojoType="dijit.layout.ContentPane" title="'.__('Options').'">

						<section class='narrow'>

						$include_in_digest = $row["include_in_digest"];

						if ($include_in_digest) {
							$checked = "checked="1"
						} else {
							$checked = "
						}

						<fieldset class='narrow'>

						<label class='checkbox'><input dojoType="dijit.form.CheckBox" type="checkbox" id="include_in_digest"
							name="include_in_digest"
							$checked> ".__('Include in e-mail digest')."</label>

						</fieldset>

						$always_display_enclosures = $row["always_display_enclosures"];

						if ($always_display_enclosures) {
							$checked = "checked
						} else {
							$checked = "
						}

						<fieldset class='narrow'>

						<label class='checkbox'><input dojoType="dijit.form.CheckBox" type="checkbox" id="always_display_enclosures"
							name="always_display_enclosures"
							$checked> ".__('Always display image attachments')."</label>

						</fieldset>

						$hide_images = $row["hide_images"];

						if ($hide_images) {
							$checked = "checked="1"
						} else {
							$checked = "
						}

						<fieldset class='narrow'>

						<label class='checkbox'><input dojoType='dijit.form.CheckBox' type='checkbox' id='hide_images'
							name='hide_images' $checked> ".__('Do not embed media')."</label>

						</fieldset>

						$cache_images = $row["cache_images"];

						if ($cache_images) {
							$checked = "checked="1"
						} else {
							$checked = "
						}

						<fieldset class='narrow'>

						<label class='checkbox'><input dojoType='dijit.form.CheckBox' type='checkbox' id='cache_images'
							name='cache_images' $checked> ". __('Cache media')."</label>

						</fieldset>

						$mark_unread_on_update = $row["mark_unread_on_update"];

						if ($mark_unread_on_update) {
							$checked = "checked
						} else {
							$checked = "
						}

						<fieldset class='narrow'>

						<label class='checkbox'><input dojoType='dijit.form.CheckBox' type='checkbox' id='mark_unread_on_update'
							name='mark_unread_on_update' $checked> ".__('Mark updated articles as unread')."</label>

						</fieldset>

						</div>

						<div dojoType="dijit.layout.ContentPane" title="${__('Icon')}">

							<img class='feedIcon feed-editor-icon' src="${feed.icon ? App.escapeHtml(feed.icon) : ""}">

							<form onsubmit="return false" id="feed_icon_upload_form" enctype="multipart/form-data" method="post">
								<label class="dijitButton">${__("Choose file...")}
									<input style="display: none" id="icon_file" size="10" name="icon_file" type="file">
								</label>

								${App.FormFields.hidden_tag("op", "pref-feeds")}
								${App.FormFields.hidden_tag("feed_id", feed_id)}
								${App.FormFields.hidden_tag("method", "uploadIcon")}
								${App.FormFields.hidden_tag("csrf_token", App.getInitParam("csrf_token"))}

								${App.FormFields.submit_tag(__("Replace"), {onclick: "return CommonDialogs.uploadFeedIcon()"})}
								${App.FormFields.submit_tag(__("Remove"), {class: "alt-danger", onclick: "return CommonDialogs.removeFeedIcon("+feed_id+")"})}
							</form>
						</div>

						<div dojoType="dijit.layout.ContentPane" title="${__('Plugins')}">
							${reply.plugin_data}
						</div>

						</div>

					<footer>
						${App.FormFields.button_tag(__("Unsubscribe"), "", {class: "pull-left alt-danger", onclick: "App.dialogOf(this).unsubscribe()"})}
						${App.FormFields.submit_tag(__("Save"), {onclick: "return App.dialogOf(this).execute()"})}
						${App.FormFields.cancel_dialog_tag(__("Cancel"))}
					</footer>
					`);
				})
			});

			dialog.show();
		},
		publishedOPML: function() {

			Notify.progress("Loading, please wait...", true);

			xhr.json("backend.php", {op: "pref-feeds", method: "getOPMLKey"}, (reply) => {
				try {
					const dialog = new fox.SingleUseDialog({
						title: __("Public OPML URL"),
						regenOPMLKey: function() {
							if (confirm(__("Replace current OPML publishing address with a new one?"))) {
								Notify.progress("Trying to change address...", true);

								xhr.json("backend.php", {op: "pref-feeds", method: "regenOPMLKey"}, (reply) => {
									if (reply) {
										const new_link = reply.link;
										const target = this.domNode.querySelector('.generated_url');

										if (new_link && target) {
											target.href = new_link;
											target.innerHTML = new_link;

											Notify.close();

										} else {
											Notify.error("Could not change feed URL.");
										}
									}
								});
							}
							return false;
						},
						content: `
							<header>${__("Your Public OPML URL is:")}</header>
							<section>
								<div class='panel text-center'>
									<a class='generated_url' href="${App.escapeHtml(reply.link)}" target='_blank'>${App.escapeHtml(reply.link)}</a>
								</div>
							</section>
							<footer class='text-center'>
								<button dojoType='dijit.form.Button' onclick="return App.dialogOf(this).regenOPMLKey()">
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
					App.Error.report(e);
				}
			});
		},
		generatedFeed: function(feed, is_cat, search = "") {

			Notify.progress("Loading, please wait...", true);

			xhr.json("backend.php", {op: "pref-feeds", method: "getsharedurl", id: feed, is_cat: is_cat, search: search}, (reply) => {
				try {
					const dialog = new fox.SingleUseDialog({
						title: __("Show as feed"),
						regenFeedKey: function(feed, is_cat) {
							if (confirm(__("Generate new syndication address for this feed?"))) {

								Notify.progress("Trying to change address...", true);

								const query = {op: "pref-feeds", method: "regenFeedKey", id: feed, is_cat: is_cat};

								xhr.json("backend.php", query, (reply) => {
									const new_link = reply.link;
									const target = this.domNode.querySelector(".generated_url");

									if (new_link && target) {
										target.innerHTML = target.innerHTML.replace(/&amp;key=.*$/,
											"&amp;key=" + new_link);

										target.href = target.href.replace(/&key=.*$/,
											"&key=" + new_link);

										Notify.close();

									} else {
										Notify.error("Could not change feed URL.");
									}
								});
							}
							return false;
						},
						content: `
							<header>${__("%s can be accessed via the following secret URL:").replace("%s", App.escapeHtml(reply.title))}</header>
							<section>
								<div class='panel text-center'>
									<a class='generated_url' href="${App.escapeHtml(reply.link)}" target='_blank'>${App.escapeHtml(reply.link)}</a>
								</div>
							</section>
							<footer>
								<button dojoType='dijit.form.Button' style='float : left' class='alt-info'
									onclick='window.open("https://tt-rss.org/wiki/GeneratedFeeds")'>
									<i class='material-icons'>help</i> ${__("More info...")}</button>
								<button dojoType='dijit.form.Button' onclick="return App.dialogOf(this).regenFeedKey('${feed}', '${is_cat}')">
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
					App.Error.report(e);
				}
			});
		},
	};
