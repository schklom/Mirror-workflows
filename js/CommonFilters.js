'use strict'

/* eslint-disable no-new */

/* global __, App, Article, Lists, fox */
/* global xhr, dojo, dijit, Notify, Feeds */

/* exported Filters */
const	Filters = {
	edit: function(id) { // if no id, new filter dialog
		let query;

		if (!App.isPrefs()) {
			query = {
				op: "pref-filters", method: "edit",
				feed: Feeds.getActive(), is_cat: Feeds.activeIsCat()
			};
		} else {
			query = {op: "pref-filters", method: "edit", id: id};
		}

		const dialog = new fox.SingleUseDialog({
			id: "filterEditDlg",
			title: id ? __("Edit Filter") : __("Create Filter"),
			ACTION_TAG: 4,
			ACTION_SCORE: 6,
			ACTION_LABEL: 7,
			ACTION_PLUGIN: 9,
			PARAM_ACTIONS: [4, 6, 7, 9],
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
			createNewRuleElement: function(parentNode, replaceNode) {
				const rule = dojo.formToJson("filter_new_rule_form");

				xhr.post("backend.php", {op: "pref-filters", method: "printrulename", rule: rule}, (reply) => {
					try {
						const li = document.createElement('li');

						li.innerHTML = `<input dojoType='dijit.form.CheckBox' type='checkbox' onclick='Lists.onRowChecked(this)'>
								<span onclick='App.dialogOf(this).onRuleClicked(this)'>${reply}</span>
							${App.FormFields.hidden_tag("rule[]", rule)}`;

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
			createNewActionElement: function(parentNode, replaceNode) {
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

						li.innerHTML = `<input dojoType='dijit.form.CheckBox' type='checkbox' onclick='Lists.onRowChecked(this)'>
								<span onclick='App.dialogOf(this).onActionClicked(this)'>${reply}</span>
							${App.FormFields.hidden_tag("action[]", action)}`;

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
			editRule: function(replaceNode, ruleStr) {
				const edit_rule_dialog = new fox.SingleUseDialog({
					id: "filterNewRuleDlg",
					title: ruleStr ? __("Edit rule") : __("Add rule"),
					execute: function () {
						if (this.validate()) {
							dialog.createNewRuleElement(App.byId("filterDlg_Matches"), replaceNode);
							this.hide();
						}
					},
					content: __('Loading, please wait...'),
				});

				const tmph = dojo.connect(edit_rule_dialog, "onShow", null, function (/* e */) {
					dojo.disconnect(tmph);

					xhr.post("backend.php", {op: 'pref-filters', method: 'newrule', rule: ruleStr}, (reply) => {
						edit_rule_dialog.attr('content', reply);
					});
				});

				edit_rule_dialog.show();
			},
			editAction: function(replaceNode, actionStr) {
				const edit_action_dialog = new fox.SingleUseDialog({
					title: actionStr ? __("Edit action") : __("Add action"),
					hideOrShowActionParam: function(sender) {
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
							dialog.createNewActionElement(App.byId("filterDlg_Actions"), replaceNode);
							this.hide();
						}
					}
				});

				const tmph = dojo.connect(edit_action_dialog, "onShow", null, function (/* e */) {
					dojo.disconnect(tmph);

					xhr.post("backend.php", {op: 'pref-filters', method: 'newaction', action: actionStr}, (reply) => {
						edit_action_dialog.attr('content', reply);

						setTimeout(() => {
							edit_action_dialog.hideOrShowActionParam(dijit.byId("filterDlg_actionSelect").attr('value'));
						}, 250);
					});
				});

				edit_action_dialog.show();
			},
			selectRules: function (select) {
				Lists.select("filterDlg_Matches", select);
			},
			selectActions: function (select) {
				Lists.select("filterDlg_Actions", select);
			},
			onRuleClicked: function (e) {
				const li = e.closest('li');
				const rule = li.querySelector('input[name="rule[]"]').value

				this.editRule(li, rule);
			},
			onActionClicked: function (e) {
				const li = e.closest('li');
				const action = li.querySelector('input[name="action[]"]').value

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

			xhr.post("backend.php", query, function (reply) {
				dialog.attr('content', reply);

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
