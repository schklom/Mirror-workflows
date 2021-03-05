'use strict'

/* eslint-disable no-new */

/* global __, App, Article, Lists, fox */
/* global xhr, dojo, dijit, Notify, Feeds */

/* exported Filters */
const	Filters = {
	edit: function(filter_id = null) { // if no id, new filter dialog

		const dialog = new fox.SingleUseDialog({
			id: "filterEditDlg",
			title: filter_id ? __("Edit filter") : __("Create new filter"),
			ACTION_TAG: 4,
			ACTION_SCORE: 6,
			ACTION_LABEL: 7,
			ACTION_PLUGIN: 9,
			PARAM_ACTIONS: [4, 6, 7, 9],
			filter_info: {},
			test: function() {
				const test_dialog = new fox.SingleUseDialog({
					title: "Test Filter",
					results: 0,
					limit: 100,
					max_offset: 10000,
					getTestResults: function (params, offset) {
						params.method = 'testFilterDo';
						params.offset = offset;
						params.limit = test_dialog.limit;

						console.log("getTestResults:" + offset);

						xhr.json("backend.php", params, (result) => {
							try {
								if (result && test_dialog && test_dialog.open) {
									test_dialog.results += result.length;

									console.log("got results:" + result.length);

									App.byId("prefFilterProgressMsg").innerHTML = __("Looking for articles (%d processed, %f found)...")
										.replace("%f", test_dialog.results)
										.replace("%d", offset);

									console.log(offset + " " + test_dialog.max_offset);

									for (let i = 0; i < result.length; i++) {
										const tmp = dojo.create("table", { innerHTML: result[i]});

										App.byId("prefFilterTestResultList").innerHTML += tmp.innerHTML;
									}

									if (test_dialog.results < 30 && offset < test_dialog.max_offset) {

										// get the next batch
										window.setTimeout(function () {
											test_dialog.getTestResults(params, offset + test_dialog.limit);
										}, 0);

									} else {
										// all done

										Element.hide("prefFilterLoadingIndicator");

										if (test_dialog.results == 0) {
											App.byId("prefFilterTestResultList").innerHTML = `<tr><td align='center'>
												${__('No recent articles matching this filter have been found.')}</td></tr>`;
											App.byId("prefFilterProgressMsg").innerHTML = "Articles matching this filter:";
										} else {
											App.byId("prefFilterProgressMsg").innerHTML = __("Found %d articles matching this filter:")
												.replace("%d", test_dialog.results);
										}

									}

								} else if (!result) {
									console.log("getTestResults: can't parse results object");
									Element.hide("prefFilterLoadingIndicator");
									Notify.error("Error while trying to get filter test results.");
								} else {
									console.log("getTestResults: dialog closed, bailing out.");
								}
							} catch (e) {
								App.Error.report(e);
							}
						});
					},
					content: `
						<div>
							<img id='prefFilterLoadingIndicator' src='images/indicator_tiny.gif'>&nbsp;
							<span id='prefFilterProgressMsg'>Looking for articles...</span>
						</div>

						<ul class='panel panel-scrollable list list-unstyled' id='prefFilterTestResultList'></ul>

						<footer class='text-center'>
							<button dojoType='dijit.form.Button' type='submit' class='alt-primary'>${__('Close this window')}</button>
						</footer>
					`
				});

				const tmph = dojo.connect(test_dialog, "onShow", null, function (/* e */) {
					dojo.disconnect(tmph);

					test_dialog.getTestResults(dialog.attr('value'), 0);
				});

				test_dialog.show();
			},
			insertRule: function(parentNode, replaceNode) {
				const rule = dojo.formToJson("filter_new_rule_form");

				xhr.post("backend.php", {op: "pref-filters", method: "printrulename", rule: rule}, (reply) => {
					try {
						const li = document.createElement('li');
						li.addClassName("rule");

						li.innerHTML = `${App.FormFields.checkbox_tag("", false, "", {onclick: 'Lists.onRowChecked(this)'})}
								<span class="name" onclick='App.dialogOf(this).onRuleClicked(this)'>${reply}</span>
								<span class="payload" >${App.FormFields.hidden_tag("rule[]", rule)}</span>`;

						dojo.parser.parse(li);

						if (replaceNode) {
							parentNode.replaceChild(li, replaceNode);
						} else {
							parentNode.appendChild(li);
						}
					} catch (e) {
						App.Error.report(e);
					}
				});
			},
			insertAction: function(parentNode, replaceNode) {
				const form = document.forms["filter_new_action_form"];

				if (form.action_id.value == 7) {
					form.action_param.value = form.action_param_label.value;
				} else if (form.action_id.value == 9) {
					form.action_param.value = form.action_param_plugin.value;
				}

				const action = dojo.formToJson(form);

				xhr.post("backend.php", { op: "pref-filters", method: "printactionname", action: action }, (reply) => {
					try {
						const li = document.createElement('li');
						li.addClassName("action");

						li.innerHTML = `${App.FormFields.checkbox_tag("", false, "", {onclick: 'Lists.onRowChecked(this)'})}
								<span class="name" onclick='App.dialogOf(this).onActionClicked(this)'>${reply}</span>
								<span class="payload">${App.FormFields.hidden_tag("action[]", action)}</span>`;

						dojo.parser.parse(li);

						if (replaceNode) {
							parentNode.replaceChild(li, replaceNode);
						} else {
							parentNode.appendChild(li);
						}

					} catch (e) {
						App.Error.report(e);
					}
				});
			},
			editRule: function(replaceNode, ruleStr = null) {
				const edit_rule_dialog = new fox.SingleUseDialog({
					id: "filterNewRuleDlg",
					title: ruleStr ? __("Edit rule") : __("Add rule"),
					execute: function () {
						if (this.validate()) {
							dialog.insertRule(App.byId("filterDlg_Matches"), replaceNode);
							this.hide();
						}
					},
					content: __('Loading, please wait...'),
				});

				const tmph = dojo.connect(edit_rule_dialog, "onShow", null, function () {
					dojo.disconnect(tmph);

					let rule;

					if (ruleStr) {
						rule = JSON.parse(ruleStr);
					} else {
						rule = {
							reg_exp: "",
							filter_type: 1,
							feed_id: ["0"],
							inverse: false,
						};
					}

					console.log(rule, dialog.filter_info);

					xhr.json("backend.php", {op: "pref-filters", method: "editrule", ids: rule.feed_id.join(",")}, function (editrule) {
						edit_rule_dialog.attr('content',
							`
							<form name="filter_new_rule_form" id="filter_new_rule_form" onsubmit="return false">

								<section>
									<textarea dojoType="fox.form.ValidationTextArea"
										required="true" id="filterDlg_regExp" ValidRegExp="true"
										rows="4" style="font-size : 14px; width : 530px; word-break: break-all"
										name="reg_exp">${rule.reg_exp}</textarea>

									<div dojoType="dijit.Tooltip" id="filterDlg_regExp_tip" connectId="filterDlg_regExp" position="below"></div>

									<fieldset>
										<label class="checkbox">
											${App.FormFields.checkbox_tag("inverse", rule.inverse)}
											${__("Inverse regular expression matching")}
										</label>
									</fieldset>
									<fieldset>
										<label style="display : inline">${__("on")}</label>
										${App.FormFields.select_hash("filter_type", rule.filter_type, dialog.filter_info.filter_types)}
										<label style="padding-left : 10px; display : inline">${__("in")}</label>
									</fieldset>
									<fieldset>
										<span id="filterDlg_feeds">
											${editrule.multiselect}
										</span>
									</fieldset>
								</section>

								<footer>
									${App.FormFields.button_tag(App.FormFields.icon("help") + " " + __("More info"), "", {class: 'pull-left alt-info',
										onclick: "window.open('https://tt-rss.org/wiki/ContentFilters')"})}
									${App.FormFields.submit_tag(App.FormFields.icon("save") + " " + __("Save"), {onclick: "App.dialogOf(this).execute()"})}
									${App.FormFields.cancel_dialog_tag(__("Cancel"))}
								</footer>

							</form>
						`);
					});

				});

				edit_rule_dialog.show();
			},
			editAction: function(replaceNode, actionStr) {
				const edit_action_dialog = new fox.SingleUseDialog({
					title: actionStr ? __("Edit action") : __("Add action"),
					select_labels: function(name, value, labels, attributes = {}, id = "") {
						const values = Object.values(labels).map((label) => label.caption);
						return App.FormFields.select_tag(name, value, values, attributes, id);
					},
					toggleParam: function(sender) {
						const action = parseInt(sender.value);

						dijit.byId("filterDlg_actionParam").domNode.hide();
						dijit.byId("filterDlg_actionParamLabel").domNode.hide();
						dijit.byId("filterDlg_actionParamPlugin").domNode.hide();

						// if selected action supports parameters, enable params field
						if (action == dialog.ACTION_LABEL) {
							dijit.byId("filterDlg_actionParamLabel").domNode.show();
						} else if (action == dialog.ACTION_PLUGIN) {
							dijit.byId("filterDlg_actionParamPlugin").domNode.show();
						} else if (dialog.PARAM_ACTIONS.indexOf(action) != -1) {
							dijit.byId("filterDlg_actionParam").domNode.show();
						}
					},
					execute: function () {
						if (this.validate()) {
							dialog.insertAction(App.byId("filterDlg_Actions"), replaceNode);
							this.hide();
						}
					},
					content: __("Loading, please wait...")
				});

				const tmph = dojo.connect(edit_action_dialog, "onShow", null, function () {
					dojo.disconnect(tmph);

					let action;

					if (actionStr) {
						action = JSON.parse(actionStr);
					} else {
						action = {
							action_id: 2,
							action_param: ""
						};
					}

					console.log(action);

					edit_action_dialog.attr('content',
					`
						<form name="filter_new_action_form" id="filter_new_action_form" onsubmit="return false;">
							<section>
								${App.FormFields.select_hash("action_id", -1,
									dialog.filter_info.action_types,
									{onchange: "App.dialogOf(this).toggleParam(this)"},
									"filterDlg_actionSelect")}

								<input dojoType="dijit.form.TextBox"
									id="filterDlg_actionParam" style="$param_hidden"
									name="action_param" value="${App.escapeHtml(action.action_param)}">

								${edit_action_dialog.select_labels("action_param_label", action.action_param,
									dialog.filter_info.labels,
									{},
									"filterDlg_actionParamLabel")}

								${App.FormFields.select_hash("action_param_plugin", action.action_param,
									dialog.filter_info.plugin_actions,
									{},
									"filterDlg_actionParamPlugin")}
							</section>
							<footer>
								${App.FormFields.submit_tag(App.FormFields.icon("save") + " " + __("Save"), {onclick: "App.dialogOf(this).execute()"})}
								${App.FormFields.cancel_dialog_tag(__("Cancel"))}
							</footer>
						</form>
					`);

					dijit.byId("filterDlg_actionSelect").attr('value', action.action_id);

					/*xhr.post("backend.php", {op: 'pref-filters', method: 'newaction', action: actionStr}, (reply) => {
						edit_action_dialog.attr('content', reply);

						setTimeout(() => {
							edit_action_dialog.hideOrShowActionParam(dijit.byId("filterDlg_actionSelect").attr('value'));
						}, 250);
					});*/
				});

				edit_action_dialog.show();
			},
			selectRules: function (select) {
				Lists.select("filterDlg_Matches", select);
			},
			selectActions: function (select) {
				Lists.select("filterDlg_Actions", select);
			},
			onRuleClicked: function (elem) {

				const li = elem.closest('li');
				const rule = li.querySelector('input[name="rule[]"]').value;

				this.editRule(li, rule);
			},
			onActionClicked: function (elem) {

				const li = elem.closest('li');
				const action = li.querySelector('input[name="action[]"]').value;

				this.editAction(li, action);
			},
			removeFilter: function () {
				const msg = __("Remove filter?");

				if (confirm(msg)) {
					this.hide();

					Notify.progress("Removing filter...");

					const query = {op: "pref-filters", method: "remove", ids: this.attr('value').id};

					xhr.post("backend.php", query, () => {
						const tree = dijit.byId("filterTree");

						if (tree) tree.reload();
					});
				}
			},
			addAction: function () {
				this.editAction();
			},
			addRule: function () {
				this.editRule();
			},
			deleteAction: function () {
				App.findAll("#filterDlg_Actions li[class*=Selected]").forEach(function (e) {
					e.parentNode.removeChild(e)
				});
			},
			deleteRule: function () {
				App.findAll("#filterDlg_Matches li[class*=Selected]").forEach(function (e) {
					e.parentNode.removeChild(e)
				});
			},
			execute: function () {
				if (this.validate()) {

					Notify.progress("Saving data...", true);

					xhr.post("backend.php", this.attr('value'), () => {
						dialog.hide();

						const tree = dijit.byId("filterTree");
						if (tree) tree.reload();
					});
				}
			},
			content: __("Loading, please wait...")
		});

		const tmph = dojo.connect(dialog, 'onShow', function () {
			dojo.disconnect(tmph);

			xhr.json("backend.php", {op: "pref-filters", method: "edit", id: filter_id}, function (filter) {

				dialog.filter_info = filter;

				const options = {
					enabled: [ filter.enabled, __('Enabled') ],
					match_any_rule: [ filter.match_any_rule, __('Match any rule') ],
					inverse: [ filter.inverse, __('Inverse matching') ],
				};

				dialog.attr('content',
				`
					<form onsubmit='return false'>

						${App.FormFields.hidden_tag("op", "pref-filters")}
						${App.FormFields.hidden_tag("id", filter_id)}
						${App.FormFields.hidden_tag("method", filter_id ? "editSave" : "add")}
						${App.FormFields.hidden_tag("csrf_token", App.getInitParam('csrf_token'))}

						<section class="horizontal">
							<input required="true" dojoType="dijit.form.ValidationTextBox" style="width : 100%"
								placeholder="${__("Title")}" name="title" value="${App.escapeHtml(filter.title)}">
						</section>

						<div dojoType="dijit.layout.TabContainer" style="height : 300px">
							<div dojoType="dijit.layout.ContentPane" title="${__('Match')}">
								<div style="padding : 0" dojoType="dijit.layout.BorderContainer" gutters="false">
									<div dojoType="fox.Toolbar" region="top">
										<div dojoType="fox.form.DropDownButton">
											<span>${__("Select")}</span>
											<div dojoType="dijit.Menu" style="display: none;">
												<!-- can"t use App.dialogOf() here because DropDownButton is not a child of the Dialog -->
												<div onclick="dijit.byId('filterEditDlg').selectRules(true)"
													dojoType="dijit.MenuItem">${__("All")}</div>
												<div onclick="dijit.byId('filterEditDlg').selectRules(false)"
													dojoType="dijit.MenuItem">${__("None")}</div>
											</div>
										</div>
										<button dojoType="dijit.form.Button" onclick="App.dialogOf(this).addRule()">
											${__("Add")}
										</button>
										<button dojoType="dijit.form.Button" onclick="App.dialogOf(this).deleteRule()">
											${__("Delete")}
										</button>
									</div>
									<div dojoType="dijit.layout.ContentPane" region="center">
										<ul id="filterDlg_Matches">
											${filter.rules.map((rule) => `
												<li class='rule'>
													${App.FormFields.checkbox_tag("", false, "", {onclick: 'Lists.onRowChecked(this)'})}
													<span class='name' onclick='App.dialogOf(this).onRuleClicked(this)'>${rule.name}</span>
													<span class='payload'>${App.FormFields.hidden_tag("rule[]", JSON.stringify(rule))}</span>
												</li>
											`).join("")}
										</ul>
									</div>
								</div>
							</div>
							<div dojoType="dijit.layout.ContentPane" title="${__('Apply actions')}">
								<div style="padding : 0" dojoType="dijit.layout.BorderContainer" gutters="false">
									<div dojoType="fox.Toolbar" region="top">
										<div dojoType="fox.form.DropDownButton">
											<span>${__("Select")}</span>
											<div dojoType="dijit.Menu" style="display: none">
												<div onclick="dijit.byId('filterEditDlg').selectActions(true)"
													dojoType="dijit.MenuItem">${__("All")}</div>
												<div onclick="dijit.byId('filterEditDlg').selectActions(false)"
													dojoType="dijit.MenuItem">${__("None")}</div>
												</div>
											</div>
										<button dojoType="dijit.form.Button" onclick="App.dialogOf(this).addAction()">
											${__("Add")}
										</button>
										<button dojoType="dijit.form.Button" onclick="App.dialogOf(this).deleteAction()">
											${__("Delete")}
										</button>
									</div>
									<div dojoType="dijit.layout.ContentPane" region="center">
										<ul id="filterDlg_Actions">
											${filter.actions.map((action) => `
											<li class='rule'>
												${App.FormFields.checkbox_tag("", false, "", {onclick: 'Lists.onRowChecked(this)'})}
												<span class='name' onclick='App.dialogOf(this).onActionClicked(this)'>${App.escapeHtml(action.name)}</span>
												<span class='payload'>${App.FormFields.hidden_tag("action[]", JSON.stringify(action))}</span>
											</li>
											`).join("")}
										</ul>
									</div>
								</div>
							</div>
						</div>

						<section class="horizontal">
							${Object.keys(options).map((name) =>
								`
								<fieldset class='narrow'>
									<label class="checkbox">
										${App.FormFields.checkbox_tag(name, options[name][0])}
										${options[name][1]}
									</label>
								</fieldset>
								`).join("")}
						</section>

						<footer>
							${filter_id ?
							`
								${App.FormFields.button_tag(App.FormFields.icon("delete") + " " + __("Remove"), "", {class: "pull-left alt-danger", onclick: "App.dialogOf(this).removeFilter()"})}
								${App.FormFields.button_tag(App.FormFields.icon("check_circle") + " " + __("Test"), "", {class: "alt-info", onclick: "App.dialogOf(this).test()"})}
								${App.FormFields.submit_tag(App.FormFields.icon("save") + " " + __("Save"), {onclick: "App.dialogOf(this).execute()"})}
								${App.FormFields.cancel_dialog_tag(__("Cancel"))}
							` : `
								${App.FormFields.button_tag(App.FormFields.icon("check_circle") + " " + __("Test"), "", {class: "alt-info", onclick: "App.dialogOf(this).test()"})}
								${App.FormFields.submit_tag(App.FormFields.icon("add") + " " + __("Create"), {onclick: "App.dialogOf(this).execute()"})}
								${App.FormFields.cancel_dialog_tag(__("Cancel"))}
							`}
						</footer>
					</form>
				`);

				if (!App.isPrefs()) {
					const selectedText = App.getSelectedText();

					if (selectedText != "") {
						const feed_id = Feeds.activeIsCat() ? 'CAT:' + parseInt(Feeds.getActive()) :
							Feeds.getActive();
						const rule = {reg_exp: selectedText, feed_id: [feed_id], filter_type: 1};

						dialog.editRule(null, dojo.toJson(rule));
					} else {
						const query = {op: "article", method: "getmetadatabyid", id: Article.getActive()};

						xhr.json("backend.php", query, (reply) => {
							let title;

							if (reply && reply.title) title = reply.title;

							if (title || Feeds.getActive() || Feeds.activeIsCat()) {
								console.log(title + " " + Feeds.getActive());

								const feed_id = Feeds.activeIsCat() ? 'CAT:' + parseInt(Feeds.getActive()) :
									Feeds.getActive();
								const rule = {reg_exp: title, feed_id: [feed_id], filter_type: 1};

								dialog.editRule(null, dojo.toJson(rule));
							}
						});
					}
				}
			});
		});

		dialog.show();
	},
};
