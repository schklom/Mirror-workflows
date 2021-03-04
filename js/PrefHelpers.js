'use strict';

/* eslint-disable no-new */
/* global __, dijit, dojo, Tables, Notify, xhr, App, fox */

const	Helpers = {
	AppPasswords: {
		getSelected: function() {
			return Tables.getSelected("app-password-list");
		},
		updateContent: function(data) {
			App.byId("app_passwords_holder").innerHTML = data;
			dojo.parser.parse("app_passwords_holder");
		},
		removeSelected: function() {
			const rows = this.getSelected();

			if (rows.length == 0) {
				alert("No passwords selected.");
			} else if (confirm(__("Remove selected app passwords?"))) {

				xhr.post("backend.php", {op: "pref-prefs", method: "deleteAppPasswords", "ids[]": rows}, (reply) => {
					this.updateContent(reply);
					Notify.close();
				});

				Notify.progress("Loading, please wait...");
			}
		},
		generate: function() {
			const title = prompt("Password description:")

			if (title) {
				xhr.post("backend.php", {op: "pref-prefs", method: "generateAppPassword", title: title}, (reply) => {
					this.updateContent(reply);
					Notify.close();
				});

				Notify.progress("Loading, please wait...");
			}
		},
	},
	Feeds: {
		clearFeedAccessKeys: function() {
			if (confirm(__("This will invalidate all previously generated feed URLs. Continue?"))) {
				Notify.progress("Clearing URLs...");

				xhr.post("backend.php", {op: "pref-feeds", method: "clearKeys"}, () => {
					Notify.info("Generated URLs cleared.");
				});
			}

			return false;
		},
	},
	Digest: {
		preview: function() {
			const dialog = new fox.SingleUseDialog({
				title: __("Digest preview"),
				content: `
					<div class='panel panel-scrollable digest-preview'>
						<div class='text-center'>${__("Loading, please wait...")}</div>
					</div>

					<footer class='text-center'>
						${App.FormFields.submit_tag(__('Close this window'))}
					</footer>
				`
			});

			const tmph = dojo.connect(dialog, 'onShow', function () {
				dojo.disconnect(tmph);

				xhr.json("backend.php", {op: "pref-prefs", method: "previewDigest"}, (reply) => {
					dialog.domNode.querySelector('.digest-preview').innerHTML = reply[0];
				});
			});

			dialog.show();

		}
	},
	System: {
		//
	},
	EventLog: {
		log_page: 0,
		refresh: function() {
			this.log_page = 0;
			this.update();
		},
		update: function() {
			xhr.post("backend.php", {
						op: "pref-system",
						severity: dijit.byId("severity").attr('value'),
						page: Helpers.EventLog.log_page
					}, (reply) => {

				dijit.byId('systemTab').attr('content', reply);
				Notify.close();
			});
		},
		nextPage: function()  {
			this.log_page += 1;
			this.update();
		},
		prevPage: function() {
			if (this.log_page > 0) this.log_page -= 1;

			this.update();
		},
		clear: function() {
			if (confirm(__("Clear event log?"))) {

				Notify.progress("Loading, please wait...");

				xhr.post("backend.php", {op: "pref-system", method: "clearLog"}, () => {
					Helpers.EventLog.refresh();
				});
			}
		},
	},
	Profiles: {
		edit: function() {
			const dialog = new fox.SingleUseDialog({
				id: "profileEditDlg",
				title: __("Manage profiles"),
				getSelectedProfiles: function () {
					return Tables.getSelected("pref-profiles-list");
				},
				removeSelected: function () {
					const sel_rows = this.getSelectedProfiles();

					if (sel_rows.length > 0) {
						if (confirm(__("Remove selected profiles? Active and default profiles will not be removed."))) {
							Notify.progress("Removing selected profiles...", true);

							xhr.post("backend.php", {op: "pref-prefs", method: "remprofiles", "ids[]": sel_rows}, () => {
								Notify.close();
								dialog.refresh();
							});
						}

					} else {
						alert(__("No profiles selected."));
					}
				},
				addProfile: function () {
					if (this.validate()) {
						Notify.progress("Creating profile...", true);

						const query = {op: "pref-prefs", method: "addprofile", title: dialog.attr('value').newprofile};

						xhr.post("backend.php", query, () => {
							Notify.close();
							dialog.refresh();
						});

					}
				},
				refresh: function() {
					xhr.json("backend.php", {op: 'pref-prefs', method: 'getprofiles'}, (reply) => {
						dialog.attr('content', `
							<div dojoType='fox.Toolbar'>
								<div dojoType='fox.form.DropDownButton'>
									<span>${__('Select')}</span>
									<div dojoType='dijit.Menu' style='display: none'>
										<div onclick="Tables.select('pref-profiles-list', true)"
											dojoType='dijit.MenuItem'>${__('All')}</div>
										<div onclick="Tables.select('pref-profiles-list', false)"
											dojoType='dijit.MenuItem'>${__('None')}</div>
									</div>
								</div>

								<div class="pull-right">
									<input name='newprofile' dojoType='dijit.form.ValidationTextBox' required='1'>
									${App.FormFields.button_tag(__('Create profile'), "", {onclick: 'App.dialogOf(this).addProfile()'})}
								</div>
							</div>

							<form onsubmit='return false'>
								<div class='panel panel-scrollable'>
									<table width='100%' id='pref-profiles-list'>
										${reply.map((profile) => `
											<tr data-row-id="${profile.id}">
												<td width='5%'>
													${App.FormFields.checkbox_tag("", false, "", {onclick: 'Tables.onRowChecked(this)'})}
												</td>
												<td>
													${profile.id > 0 ?
														`<span dojoType='dijit.InlineEditBox' width='300px' autoSave='false'
															profile-id='${profile.id}'>${profile.title}
																<script type='dojo/method' event='onChange' args='value'>
																	xhr.post("backend.php",
																		{op: 'pref-prefs', method: 'saveprofile', value: value, id: this.attr('profile-id')}, () => {
																			//
																		});
																</script>
														</span>` : `${profile.title}`}
													${profile.active ? __("(active)") : ""}
												</td>
											</tr>
										`).join("")}
									</table>
								</div>

								<footer>
									${App.FormFields.button_tag(__('Remove selected profiles'), "",
										{class: 'pull-left alt-danger', onclick: 'App.dialogOf(this).removeSelected()'})}
									${App.FormFields.submit_tag(__('Activate profile'), {onclick: 'App.dialogOf(this).execute()'})}
									${App.FormFields.cancel_dialog_tag(__('Cancel'))}
								</footer>
							</form>
						`);
					});
				},
				execute: function () {
					const sel_rows = this.getSelectedProfiles();

					if (sel_rows.length == 1) {
						if (confirm(__("Activate selected profile?"))) {
							Notify.progress("Loading, please wait...");

							xhr.post("backend.php", {op: "pref-prefs", method: "activateprofile", id: sel_rows.toString()}, () => {
								window.location.reload();
							});
						}

					} else {
						alert(__("Please choose a profile to activate."));
					}
				},
				content: ""
			});

			dialog.refresh();
			dialog.show();
		},
	},
	Prefs: {
		customizeCSS: function() {
			xhr.json("backend.php", {op: "pref-prefs", method: "customizeCSS"}, (reply) => {

				const dialog = new fox.SingleUseDialog({
					title: __("Customize stylesheet"),
					apply: function() {
						xhr.post("backend.php", this.attr('value'), () => {
							Element.show("css_edit_apply_msg");
							App.byId("user_css_style").innerText = this.attr('value');
						});
					},
					execute: function () {
						Notify.progress('Saving data...', true);

						xhr.post("backend.php", this.attr('value'), () => {
							window.location.reload();
						});
					},
					content: `
						<div class='alert alert-info'>
							${__("You can override colors, fonts and layout of your currently selected theme with custom CSS declarations here.")}
						</div>

						${App.FormFields.hidden_tag('op', 'rpc')}
						${App.FormFields.hidden_tag('method', 'setpref')}
						${App.FormFields.hidden_tag('key', 'USER_STYLESHEET')}

						<div id='css_edit_apply_msg' style='display : none'>
							<div class='alert alert-warning'>
								${__("User CSS has been applied, you might need to reload the page to see all changes.")}
							</div>
						</div>

						<textarea class='panel user-css-editor' dojoType='dijit.form.SimpleTextarea'
							style='font-size : 12px;' name='value'>${reply.value}</textarea>

						<footer>
							<button dojoType='dijit.form.Button' class='alt-success' onclick="App.dialogOf(this).apply()">
								${__('Apply')}
							</button>
							<button dojoType='dijit.form.Button' class='alt-primary' type='submit'>
								${__('Save and reload')}
							</button>
							<button dojoType='dijit.form.Button' onclick="App.dialogOf(this).hide()">
								${__('Cancel')}
							</button>
						</footer>
					`
				});

				dialog.show();

			});
		},
		confirmReset: function() {
			if (confirm(__("Reset to defaults?"))) {
				xhr.post("backend.php", {op: "pref-prefs", method: "resetconfig"}, (reply) => {
					Helpers.Prefs.refresh();
					Notify.info(reply);
				});
			}
		},
		refresh: function() {
			xhr.post("backend.php", { op: "pref-prefs" }, (reply) => {
				dijit.byId('prefsTab').attr('content', reply);
				Notify.close();
			});
		},
	},
	Plugins: {
		clearPluginData: function(name) {
			if (confirm(__("Clear stored data for this plugin?"))) {
				Notify.progress("Loading, please wait...");

				xhr.post("backend.php", {op: "pref-prefs", method: "clearPluginData", name: name}, () => {
					Helpers.Prefs.refresh();
				});
			}
		},
		checkForUpdate: function(name = null) {
			Notify.progress("Checking for plugin updates...");

			xhr.json("backend.php", {op: "pref-prefs", method: "checkForPluginUpdates", name: name}, (reply) => {
				Notify.close();

				if (reply) {
					let plugins_with_updates = 0;

					reply.forEach((p) => {
						if (p.rv.o) {
							const button = dijit.getEnclosingWidget(App.find(`*[data-update-btn-for-plugin="${p.plugin}"]`));

							if (button) {
								button.domNode.show();
								++plugins_with_updates;
							}
						}
					});

					if (plugins_with_updates > 0)
						App.find(".update-all-plugins-btn").show();
				} else {
					Notify.error("Unable to check for plugin updates.");
				}
			});
		},
		uninstall: function(plugin) {
			const msg = __("Uninstall plugin %s?").replace("%s", plugin);

			if (confirm(msg)) {
				Notify.progress("Loading, please wait...");

				xhr.json("backend.php", {op: "pref-prefs", method: "uninstallPlugin", plugin: plugin}, (reply) => {
					if (reply && reply.status == 1)
						Helpers.Prefs.refresh();
					else {
						Notify.error("Plugin uninstallation failed.");
					}
				});

			}
		},
		install: function() {
			const dialog = new fox.SingleUseDialog({
				PI_RES_ALREADY_INSTALLED: "PI_RES_ALREADY_INSTALLED",
				PI_RES_SUCCESS: "PI_RES_SUCCESS",
				PI_ERR_NO_CLASS: "PI_ERR_NO_CLASS",
				PI_ERR_NO_INIT_PHP: "PI_ERR_NO_INIT_PHP",
				PI_ERR_EXEC_FAILED: "PI_ERR_EXEC_FAILED",
				PI_ERR_NO_TEMPDIR: "PI_ERR_NO_TEMPDIR",
				PI_ERR_PLUGIN_NOT_FOUND: "PI_ERR_PLUGIN_NOT_FOUND",
				PI_ERR_NO_WORKDIR: "PI_ERR_NO_WORKDIR",
				title: __("Available plugins"),
				need_refresh: false,
				entries: false,
				search_query: "",
				installed_plugins: [],
				onHide: function() {
					if (this.need_refresh) {
						Helpers.Prefs.refresh();
					}
				},
				performInstall: function(plugin) {

					const install_dialog = new fox.SingleUseDialog({
						title: __("Plugin installer"),
						content: `
						<ul class="panel panel-scrollable contents">
						<li class='text-center'>${__("Installing %s, please wait...").replace("%s", plugin)}</li>
						</ul>

						<footer class='text-center'>
							${App.FormFields.submit_tag(__("Close this window"))}
						</footer>`
					});

					const tmph = dojo.connect(install_dialog, 'onShow', function () {
						dojo.disconnect(tmph);

						const container = install_dialog.domNode.querySelector(".contents");

						xhr.json("backend.php", {op: "pref-prefs", method: "installPlugin", plugin: plugin}, (reply) => {
							if (!reply) {
								container.innerHTML = `<li class='text-center text-error'>${__("Operation failed: check event log.")}</li>`;
							} else {
								switch (reply.result) {
									case dialog.PI_RES_SUCCESS:
										container.innerHTML = `<li class='text-success text-center'>${__("Plugin has been installed.")}</li>`
										dialog.need_refresh = true;
										break;
									case dialog.PI_RES_ALREADY_INSTALLED:
										container.innerHTML =  `<li class='text-success text-center'>${__("Plugin is already installed.")}</li>`
										break;
									default:
										container.innerHTML = `
											<li>
												<h3 style="margin-top: 0">${plugin}</h3>
												<div class='text-error'>${reply.result}</div>
												${reply.stderr ? `<pre class="small text-error pre-wrap">${reply.stderr}</pre>` : ''}
												${reply.stdour ? `<pre class="small text-success pre-wrap">${reply.stdout}</pre>` : ''}
												<p class="small">
													${App.FormFields.icon("error_outline") + " " + __("Exited with RC: %d").replace("%d", reply.git_status)}
												</p>
											</li>
										`;
								}
							}
						});
					});

					install_dialog.show();

				},
				search: function() {
					this.search_query = this.attr('value').search.toLowerCase();
					this.render_contents();
				},
				render_contents: function() {
					const container = dialog.domNode.querySelector(".contents");

					if (!dialog.entries) {
						container.innerHTML = `<li class='text-center text-error'>${__("Operation failed: check event log.")}</li>`;
					} else {
						container.innerHTML = "";

						let results_rendered = 0;

						const search_tokens = dialog.search_query
							.split(/ {1,}/)
							.filter((stoken) => (stoken.length > 0 ? stoken : null));

						dialog.entries.forEach((plugin) => {
							const is_installed = (dialog.installed_plugins
								.filter((p) => plugin.topics.map((t) => t.replace(/-/, "_")).includes(p))).length > 0;

							if (search_tokens.length == 0 ||
									Object.values(plugin).filter((pval) =>
										search_tokens.filter((stoken) =>
											(pval.indexOf(stoken) != -1 ? stoken : null)
										).length == search_tokens.length).length > 0) {

								++results_rendered;

								container.innerHTML += `
									<li data-row-value="${App.escapeHtml(plugin.name)}" class="${is_installed ? "plugin-installed" : ""}">
										${App.FormFields.button_tag(is_installed ? __("Already installed") : __('Install'), "", {class: 'alt-primary pull-right',
											disabled: is_installed,
											onclick: `App.dialogOf(this).performInstall("${App.escapeHtml(plugin.name)}")`})}

										<h3 style="margin-top: 0">${plugin.name}
											<a target="_blank" href="${App.escapeHtml(plugin.html_url)}">
												${App.FormFields.icon("open_in_new_window")}
											</a>
										</h3>

										<p>${plugin.description}</p>

										<hr/>
									</li>
									`
							}
						});

						if (results_rendered == 0) {
							container.innerHTML = `<li class='text-center text-info'>${__("Could not find any plugins for this search query.")}</li>`;
						}

						dojo.parser.parse(container);
					}
				},
				reload: function() {
					const container = dialog.domNode.querySelector(".contents");
					container.innerHTML = `<li class='text-center'>${__("Looking for plugins...")}</li>`;

					xhr.json("backend.php", {op: "pref-prefs", method: "getAvailablePlugins"}, (reply) => {
						dialog.entries = reply;
						dialog.render_contents();
					});
				},
				content: `
					<div dojoType='fox.Toolbar'>
						<div class='pull-right'>
							<input name="search" placeholder="${__("Search...")}" type="search" dojoType="dijit.form.TextBox" onkeyup="App.dialogOf(this).search()">
						</div>
						<div style='height : 16px'>&nbsp;</div> <!-- disgusting -->
					</div>

					<ul style='clear : both' class="panel panel-scrollable-400px contents plugin-installer-list"> </ul>

					<footer>
						${App.FormFields.button_tag(__("Refresh"), "", {class: 'alt-primary', onclick: 'App.dialogOf(this).reload()'})}
						${App.FormFields.cancel_dialog_tag(__("Close"))}
					</footer>
				`,
			});

			const tmph = dojo.connect(dialog, 'onShow', function () {
				dojo.disconnect(tmph);

				dialog.installed_plugins = [...document.querySelectorAll('*[data-plugin-name]')].map((p) => p.getAttribute('data-plugin-name'));

				dialog.reload();
			});

			dialog.show();
		},
		update: function(name = null) {

			const dialog = new fox.SingleUseDialog({
				title: __("Update plugins"),
				need_refresh: false,
				plugins_to_update: [],
				onHide: function() {
					if (this.need_refresh) {
						Helpers.Prefs.refresh();
					}
				},
				performUpdate: function() {
					const container = dialog.domNode.querySelector(".update-results");

					console.log('updating', dialog.plugins_to_update);

					container.innerHTML = `<li class='text-center'>${__("Updating, please wait...")}</li>`;
					let enable_update_btn = false;

					xhr.json("backend.php", {op: "pref-prefs", method: "updateLocalPlugins", plugins: dialog.plugins_to_update.join(",")}, (reply) => {

						if (!reply) {
							container.innerHTML = `<li class='text-center text-error'>${__("Operation failed: check event log.")}</li>`;
						} else {
							container.innerHTML = "";

							reply.forEach((p) => {
								if (p.rv.s == 0)
									dialog.need_refresh = true;
								else
									enable_update_btn = true;

								container.innerHTML +=
								`
								<li><h3 style="margin-top: 0">${p.plugin}</h3>
									${p.rv.e ? `<pre class="small text-error pre-wrap">${p.rv.e}</pre>` : ''}
									${p.rv.o ? `<pre class="small text-success pre-wrap">${p.rv.o}</pre>` : ''}
									<p class="small">
										${p.rv.s ? App.FormFields.icon("error_outline") + " " + __("Exited with RC: %d").replace("%d", p.rv.s) :
											App.FormFields.icon("check") + " " + __("Update done.")}
								</p>
								</li>
								`
							});
						}

						dijit.getEnclosingWidget(dialog.domNode.querySelector(".update-btn")).attr('disabled', !enable_update_btn);
					});
				},
				content: `
					<ul class="panel panel-scrollable update-results">
						<li class='text-center'>${__("Looking for changes...")}</li>
					</ul>

					<footer>
						${App.FormFields.button_tag(__("Update"), "", {disabled: true, class: "update-btn alt-primary", onclick: "App.dialogOf(this).performUpdate()"})}
						${App.FormFields.cancel_dialog_tag(__("Close"))}
					</footer>
				`,
			});

			const tmph = dojo.connect(dialog, 'onShow', function () {
				dojo.disconnect(tmph);

				xhr.json("backend.php", {op: "pref-prefs", method: "checkForPluginUpdates", name: name}, (reply) => {
					const container = dialog.domNode.querySelector(".update-results");
					let enable_update_btn = false;

					if (!reply) {
						container.innerHTML = `<li class='text-center text-error'>${__("Operation failed: check event log.")}</li>`;
					} else {
						container.innerHTML = "";

						dialog.plugins_to_update = [];

						reply.forEach((p) => {
							if (p.rv.s == 0) {
								enable_update_btn = true;
								dialog.plugins_to_update.push(p.plugin);
							}

							container.innerHTML +=
							`
							<li><h3 style="margin-top: 0">${p.plugin}</h3>
								${p.rv.e ? `<pre class="small text-error pre-wrap">${p.rv.e}</pre>` : ''}
								${p.rv.o ? `<pre class="small text-success pre-wrap">${p.rv.o}</pre>` : ''}
								<p class="small">
									${p.rv.s ? App.FormFields.icon("error_outline") + " " + __("Exited with RC: %d").replace("%d", p.rv.s) :
									App.FormFields.icon("check") + " " + __("Ready to update")}
								</p>
							</li>
							`
						});
					}

					dijit.getEnclosingWidget(dialog.domNode.querySelector(".update-btn")).attr('disabled', !enable_update_btn);

				});

			});

			dialog.show();
		},
	},
	OPML: {
		import: function() {
			const opml_file = App.byId("opml_file");

			if (opml_file.value.length == 0) {
				alert(__("Please choose an OPML file first."));
				return false;
			} else {
				Notify.progress("Importing, please wait...", true);

				const xhr = new XMLHttpRequest();

				xhr.open( 'POST', 'backend.php', true );
				xhr.onload = function () {
					Notify.close();

					const dialog = new fox.SingleUseDialog({
						title: __("OPML Import"),
						onCancel: function () {
							this.execute();
						},
						execute: function () {
							const tree = dijit.byId('feedTree');

							if (tree) tree.reload();
						},
						content: `
							<div class='alert alert-info'>
								${__("If you have imported labels and/or filters, you might need to reload preferences to see your new data.")}
							</div>
							<div class='panel panel-scrollable'>
								${xhr.responseText}
							</div>
							<footer class='text-center'>
								<button dojoType='dijit.form.Button' type='submit' class='alt-primary'>
									${__('Close this window')}
								</button>
							</footer>
						`
					});

					dialog.show();
				};

				xhr.send(new FormData(App.byId("opml_import_form")));

				return false;
			}
		},
		export: function() {
			console.log("export");
			window.open("backend.php?op=opml&method=export&" + dojo.formToQuery("opmlExportForm"));
		},
		publish: function() {
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
	}
};
