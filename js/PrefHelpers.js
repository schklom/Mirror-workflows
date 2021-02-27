'use strict';

/* eslint-disable no-new */
/* global __, dijit, dojo, Tables, xhrPost, Notify, xhr, App, fox */

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

				xhr.post("backend.php", {op: "pref-prefs", method: "deleteAppPassword", ids: rows.toString()}, (reply) => {
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
				title: __("Settings Profiles"),
				getSelectedProfiles: function () {
					return Tables.getSelected("pref-profiles-list");
				},
				removeSelected: function () {
					const sel_rows = this.getSelectedProfiles();

					if (sel_rows.length > 0) {
						if (confirm(__("Remove selected profiles? Active and default profiles will not be removed."))) {
							Notify.progress("Removing selected profiles...", true);

							const query = {
								op: "pref-prefs", method: "remprofiles",
								ids: sel_rows.toString()
							};

							xhr.post("backend.php", query, () => {
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
		updateLocal: function(name = null) {
			const msg = name ? __("Update %p using git?").replace("%p", name) :
				__("Update all local plugins using git?");

			if (confirm(msg)) {

				const dialog = new fox.SingleUseDialog({
					title: __("Plugin Updater"),
					content: `
						<ul class="panel panel-scrollable update-results">
							<li>${__("Loading, please wait...")}</li>
						</ul>

						<footer class="text-center">
							${App.FormFields.submit_tag(__("Close this window"))}
						</footer>
					`,
				});

				const tmph = dojo.connect(dialog, 'onShow', function () {
					dojo.disconnect(tmph);

					xhr.json("backend.php", {op: "pref-prefs", method: "updateLocalPlugins", name: name}, (reply) => {
						const container = dialog.domNode.querySelector(".update-results");

						if (!reply) {
							container.innerHTML = __("Operation failed: check event log.");
						} else {
							container.innerHTML = "";

							reply.forEach((p) => {
								container.innerHTML +=
								`
								<li><h3 style="margin-top: 0">${p.plugin}</h3>
									${p.rv.e ? `<pre class="small text-error">${p.rv.e}</pre>` : ''}
									${p.rv.o ? `<pre class="small text-success">${p.rv.o}</pre>` : ''}
									<p class="small">
										${p.rv.s ? __("Exited with RC: %d").replace("%d", p.rv.s) : __("OK")}
									</p>
								</li>
								`
							});
						}
					});

				});

				dialog.show();
			}
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
