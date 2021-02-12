'use strict'

/* global __, App, Article, Lists, Effect */
/* global xhrPost, dojo, dijit, Notify, $$, Feeds */

const	Filters = {
	filterDlgCheckAction: function(sender) {
		const action = sender.value;

		const action_param = $("filterDlg_paramBox");

		if (!action_param) {
			console.log("filterDlgCheckAction: can't find action param box!");
			return;
		}

		// if selected action supports parameters, enable params field
		if (action == 4 || action == 6 || action == 7 || action == 9) {
			new Effect.Appear(action_param, {duration: 0.5});

			Element.hide(dijit.byId("filterDlg_actionParam").domNode);
			Element.hide(dijit.byId("filterDlg_actionParamLabel").domNode);
			Element.hide(dijit.byId("filterDlg_actionParamPlugin").domNode);

			if (action == 7) {
				Element.show(dijit.byId("filterDlg_actionParamLabel").domNode);
			} else if (action == 9) {
				Element.show(dijit.byId("filterDlg_actionParamPlugin").domNode);
			} else {
				Element.show(dijit.byId("filterDlg_actionParam").domNode);
			}

		} else {
			Element.hide(action_param);
		}
	},
	createNewRuleElement: function(parentNode, replaceNode) {
		const rule = dojo.formToJson("filter_new_rule_form");

		xhrPost("backend.php", {op: "pref-filters", method: "printrulename", rule: rule}, (transport) => {
			try {
				const li = document.createElement('li');

				li.innerHTML = `<input dojoType='dijit.form.CheckBox' type='checkbox' onclick='Lists.onRowChecked(this)'>
						<span onclick='App.dialogOf(this).editRule(this)'>${transport.responseText}</span>
					${App.FormFields.hidden("rule[]", rule)}`;

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

		xhrPost("backend.php", { op: "pref-filters", method: "printactionname", action: action }, (transport) => {
			try {
				const li = document.createElement('li');

				li.innerHTML = `<input dojoType='dijit.form.CheckBox' type='checkbox' onclick='Lists.onRowChecked(this)'>
						<span onclick='App.dialogOf(this).editAction(this)'>${transport.responseText}</span>
					${App.FormFields.hidden("action[]", action)}`;

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
	addFilterRule: function(replaceNode, ruleStr) {
		if (dijit.byId("filterNewRuleDlg"))
			dijit.byId("filterNewRuleDlg").destroyRecursive();

		const rule_dlg = new dijit.Dialog({
			id: "filterNewRuleDlg",
			title: ruleStr ? __("Edit rule") : __("Add rule"),
			execute: function () {
				if (this.validate()) {
					Filters.createNewRuleElement($("filterDlg_Matches"), replaceNode);
					this.hide();
				}
			},
			content: __('Loading, please wait...'),
		});

		const tmph = dojo.connect(rule_dlg, "onShow", null, function (/* e */) {
			dojo.disconnect(tmph);

			xhrPost("backend.php", {op: 'pref-filters', method: 'newrule', rule: ruleStr}, (transport) => {
				rule_dlg.attr('content', transport.responseText);
			});
		});

		rule_dlg.show();
	},
	addFilterAction: function(replaceNode, actionStr) {
		if (dijit.byId("filterNewActionDlg"))
			dijit.byId("filterNewActionDlg").destroyRecursive();

		const query = "backend.php?op=pref-filters&method=newaction&action=" +
			encodeURIComponent(actionStr);

		const rule_dlg = new dijit.Dialog({
			id: "filterNewActionDlg",
			title: actionStr ? __("Edit action") : __("Add action"),
			execute: function () {
				if (this.validate()) {
					Filters.createNewActionElement($("filterDlg_Actions"), replaceNode);
					this.hide();
				}
			},
			href: query
		});

		rule_dlg.show();
	},
	test: function(params) {

		if (dijit.byId("filterTestDlg"))
			dijit.byId("filterTestDlg").destroyRecursive();

		const test_dlg = new dijit.Dialog({
			id: "filterTestDlg",
			title: "Test Filter",
			results: 0,
			limit: 100,
			max_offset: 10000,
			getTestResults: function (params, offset) {
				params.method = 'testFilterDo';
				params.offset = offset;
				params.limit = test_dlg.limit;

				console.log("getTestResults:" + offset);

				xhrPost("backend.php", params, (transport) => {
					try {
						const result = JSON.parse(transport.responseText);

						if (result && dijit.byId("filterTestDlg") && dijit.byId("filterTestDlg").open) {
							test_dlg.results += result.length;

							console.log("got results:" + result.length);

							$("prefFilterProgressMsg").innerHTML = __("Looking for articles (%d processed, %f found)...")
								.replace("%f", test_dlg.results)
								.replace("%d", offset);

							console.log(offset + " " + test_dlg.max_offset);

							for (let i = 0; i < result.length; i++) {
								const tmp = dojo.create("table", { innerHTML: result[i]});

								$("prefFilterTestResultList").innerHTML += tmp.innerHTML;
							}

							if (test_dlg.results < 30 && offset < test_dlg.max_offset) {

								// get the next batch
								window.setTimeout(function () {
									test_dlg.getTestResults(params, offset + test_dlg.limit);
								}, 0);

							} else {
								// all done

								Element.hide("prefFilterLoadingIndicator");

								if (test_dlg.results == 0) {
									$("prefFilterTestResultList").innerHTML = `<tr><td align='center'>
										${__('No recent articles matching this filter have been found.')}</td></tr>`;
									$("prefFilterProgressMsg").innerHTML = "Articles matching this filter:";
								} else {
									$("prefFilterProgressMsg").innerHTML = __("Found %d articles matching this filter:")
										.replace("%d", test_dlg.results);
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

		dojo.connect(test_dlg, "onShow", null, function (/* e */) {
			test_dlg.getTestResults(params, 0);
		});

		test_dlg.show();
	},
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

		console.log('Filters.edit', query);

		xhrPost("backend.php", query, function (transport) {
			if (dijit.byId("feedEditDlg"))
				dijit.byId("feedEditDlg").destroyRecursive();

			if (dijit.byId("filterEditDlg"))
				dijit.byId("filterEditDlg").destroyRecursive();

			const dialog = new dijit.Dialog({
				id: "filterEditDlg",
				title: __("Create Filter"),
				test: function () {
					Filters.test(this.attr('value'));
				},
				selectRules: function (select) {
					Lists.select("filterDlg_Matches", select);
				},
				selectActions: function (select) {
					Lists.select("filterDlg_Actions", select);
				},
				editRule: function (e) {
					const li = e.closest('li');
					const rule = li.querySelector('input[name="rule[]"]').value

					Filters.addFilterRule(li, rule);
				},
				editAction: function (e) {
					const li = e.closest('li');
					const action = li.querySelector('input[name="action[]"]').value

					Filters.addFilterAction(li, action);
				},
				removeFilter: function () {
					const msg = __("Remove filter?");

					if (confirm(msg)) {
						this.hide();

						Notify.progress("Removing filter...");

						const query = {op: "pref-filters", method: "remove", ids: this.attr('value').id};

						xhrPost("backend.php", query, () => {
							const tree = dijit.byId("filterTree");

							if (tree) tree.reload();
						});
					}
				},
				addAction: function () {
					Filters.addFilterAction();
				},
				addRule: function () {
					Filters.addFilterRule();
				},
				deleteAction: function () {
					$$("#filterDlg_Actions li[class*=Selected]").each(function (e) {
						e.parentNode.removeChild(e)
					});
				},
				deleteRule: function () {
					$$("#filterDlg_Matches li[class*=Selected]").each(function (e) {
						e.parentNode.removeChild(e)
					});
				},
				execute: function () {
					if (this.validate()) {

						Notify.progress("Saving data...", true);

						xhrPost("backend.php", this.attr('value'), () => {
							dialog.hide();

							const tree = dijit.byId("filterTree");
							if (tree) tree.reload();
						});
					}
				},
				content: transport.responseText
			});

			if (!App.isPrefs()) {
				/* global getSelectionText */
				const selectedText = getSelectionText();

				const lh = dojo.connect(dialog, "onLoad", function () {
					dojo.disconnect(lh);

					if (selectedText != "") {

						const feed_id = Feeds.activeIsCat() ? 'CAT:' + parseInt(Feeds.getActive()) :
							Feeds.getActive();

						const rule = {reg_exp: selectedText, feed_id: [feed_id], filter_type: 1};

						Filters.addFilterRule(null, dojo.toJson(rule));

					} else {

						const query = {op: "rpc", method: "getlinktitlebyid", id: Article.getActive()};

						xhrPost("backend.php", query, (transport) => {
							const reply = JSON.parse(transport.responseText);

							let title = false;

							if (reply && reply.title) title = reply.title;

							if (title || Feeds.getActive() || Feeds.activeIsCat()) {

								console.log(title + " " + Feeds.getActive());

								const feed_id = Feeds.activeIsCat() ? 'CAT:' + parseInt(Feeds.getActive()) :
									Feeds.getActive();

								const rule = {reg_exp: title, feed_id: [feed_id], filter_type: 1};

								Filters.addFilterRule(null, dojo.toJson(rule));
							}
						});
					}
				});
			}
			dialog.show();
		});
	},
};
