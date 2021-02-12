/* global __, lib, dijit, define, dojo, CommonDialogs, Notify, Tables, xhrPost, fox, App */

define(["dojo/_base/declare", "dojo/dom-construct", "lib/CheckBoxTree"], function (declare, domConstruct) {

	return declare("fox.PrefFeedTree", lib.CheckBoxTree, {
		_createTreeNode: function(args) {
			const tnode = this.inherited(arguments);

			const icon = dojo.doc.createElement('img');
			if (args.item.icon && args.item.icon[0]) {
				icon.src = args.item.icon[0];
			} else {
				icon.src = 'images/blank_icon.gif';
			}
			icon.className = 'icon';
			domConstruct.place(icon, tnode.iconNode, 'only');

			let param = this.model.store.getValue(args.item, 'param');

			if (param) {
				param = dojo.doc.createElement('span');
				param.className = 'feedParam';
				param.innerHTML = args.item.param[0];
				//domConstruct.place(param, tnode.labelNode, 'after');
				domConstruct.place(param, tnode.rowNode, 'first');
			}

			const id = args.item.id[0];
			const bare_id = parseInt(id.substr(id.indexOf(':')+1));

			if (id.match("CAT:") && bare_id > 0) {
				const menu = new dijit.Menu();
				menu.row_id = bare_id;
				menu.item = args.item;

				menu.addChild(new dijit.MenuItem({
					label: __("Edit category"),
					onClick: function() {
						dijit.byId("feedTree").editCategory(this.getParent().row_id, this.getParent().item, null);
					}}));


				menu.addChild(new dijit.MenuItem({
					label: __("Remove category"),
					onClick: function() {
						dijit.byId("feedTree").removeCategory(this.getParent().row_id, this.getParent().item);
					}}));

				menu.bindDomNode(tnode.domNode);
				tnode._menu = menu;
			} else if (id.match("FEED:")) {
				const menu = new dijit.Menu();
				menu.row_id = bare_id;
				menu.item = args.item;

				menu.addChild(new dijit.MenuItem({
					label: __("Edit feed"),
					onClick: function() {
						CommonDialogs.editFeed(this.getParent().row_id);
					}}));

				menu.addChild(new dijit.MenuItem({
					label: __("Unsubscribe"),
					onClick: function() {
						CommonDialogs.unsubscribeFeed(this.getParent().row_id, this.getParent().item.name);
					}}));

				menu.bindDomNode(tnode.domNode);
				tnode._menu = menu;

			}

			return tnode;
		},
		onDndDrop: function() {
			this.inherited(arguments);
			this.tree.model.store.save();
		},
		// eslint-disable-next-line no-unused-vars
		getRowClass: function (item, opened) {
			let rc = (!item.error || item.error == '') ? "dijitTreeRow" :
				"dijitTreeRow Error";

			if (item.updates_disabled > 0) rc += " UpdatesDisabled";

			return rc;
		},
		getIconClass: function (item, opened) {
			// eslint-disable-next-line no-nested-ternary
			return (!item || this.model.store.getValue(item, 'type') == 'category') ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "feed-icon";
		},
		reload: function() {
			const searchElem = $("feed_search");
			const search = (searchElem) ? searchElem.value : "";

			xhrPost("backend.php", { op: "pref-feeds", search: search }, (transport) => {
				dijit.byId('feedsTab').attr('content', transport.responseText);
				Notify.close();
			});
		},
		checkItemAcceptance: function(target, source, position) {
			const item = dijit.getEnclosingWidget(target).item;

			// disable copying items
			source.copyState = function() { return false; };

			let source_item = false;

			source.forInSelectedItems(function(node) {
				source_item = node.data.item;
			});

			if (!source_item || !item) return false;

			const id = this.tree.model.store.getValue(item, 'id');
			const source_id = source.tree.model.store.getValue(source_item, 'id');

			//console.log(id + " " + position + " " + source_id);

			if (source_id.match("FEED:")) {
				return ((id.match("CAT:") && position == "over") ||
				(id.match("FEED:") && position != "over"));
			} else if (source_id.match("CAT:")) {
				return ((id.match("CAT:") && !id.match("CAT:0")) ||
				(id.match("root") && position == "over"));
			}
		},
		resetFeedOrder: function() {
			Notify.progress("Loading, please wait...");

			xhrPost("backend.php", {op: "pref-feeds", method: "feedsortreset"}, () => {
				this.reload();
			});
		},
		resetCatOrder: function() {
			Notify.progress("Loading, please wait...");

			xhrPost("backend.php", {op: "pref-feeds", method: "catsortreset"}, () => {
				this.reload();
			});
		},
		removeCategory: function(id, item) {
			if (confirm(__("Remove category %s? Any nested feeds would be placed into Uncategorized.").replace("%s", item.name))) {
				Notify.progress("Removing category...");

				xhrPost("backend.php", {op: "pref-feeds", method: "removeCat", ids: id}, () => {
					Notify.close();
					this.reload();
				});
			}
		},
		removeSelectedFeeds: function() {
			const sel_rows = this.getSelectedFeeds();

			if (sel_rows.length > 0) {
				if (confirm(__("Unsubscribe from selected feeds?"))) {

					Notify.progress("Unsubscribing from selected feeds...", true);

					const query = {
						op: "pref-feeds", method: "remove",
						ids: sel_rows.toString()
					};

					xhrPost("backend.php", query, () => {
						this.reload();
					});
				}

			} else {
				alert(__("No feeds selected."));
			}

			return false;
		},
		checkInactiveFeeds: function() {
			xhrPost("backend.php", {op: "pref-feeds", method: "getinactivefeeds"}, (transport) => {
				if (parseInt(transport.responseText) > 0) {
					Element.show(dijit.byId("pref_feeds_inactive_btn").domNode);
				}
			});
		},
		getSelectedCategories: function() {
			const tree = this;
			const items = tree.model.getCheckedItems();
			const rv = [];

			items.each(function (item) {
				if (item.id[0].match("CAT:"))
					rv.push(tree.model.store.getValue(item, 'bare_id'));
			});

			return rv;
		},
		removeSelectedCategories: function() {
			const sel_rows = this.getSelectedCategories();

			if (sel_rows.length > 0) {
				if (confirm(__("Remove selected categories?"))) {
					Notify.progress("Removing selected categories...");

					const query = {
						op: "pref-feeds", method: "removeCat",
						ids: sel_rows.toString()
					};

					xhrPost("backend.php", query, () => {
						this.reload();
					});
				}
			} else {
				alert(__("No categories selected."));
			}

			return false;
		},
		getSelectedFeeds: function() {
			const tree = this;
			const items = tree.model.getCheckedItems();
			const rv = [];

			items.each(function (item) {
				if (item.id[0].match("FEED:"))
					rv.push(tree.model.store.getValue(item, 'bare_id'));
			});

			return rv;
		},
		editSelectedFeed: function() {
			const rows = this.getSelectedFeeds();

			if (rows.length == 0) {
				alert(__("No feeds selected."));
				return;
			}

			Notify.close();

			if (rows.length > 1) {
				return this.editMultiple();
			} else {
				CommonDialogs.editFeed(rows[0], {});
			}
		},
		editMultiple: function() {
			const rows = this.getSelectedFeeds();

			if (rows.length == 0) {
				alert(__("No feeds selected."));
				return;
			}

			Notify.progress("Loading, please wait...");

			xhrPost("backend.php", {op: "pref-feeds", method: "editfeeds", ids: rows.toString()}, (transport) => {
				Notify.close();

				try {
					const dialog = new fox.SingleUseDialog({
						id: "feedEditDlg",
						title: __("Edit Multiple Feeds"),
						getChildByName: function (name) {
							let rv = null;
							this.getChildren().each(
								function (child) {
									if (child.name == name) {
										rv = child;
										return;
									}
								});
							return rv;
						},
						toggleField: function (checkbox, elem, label) {
							this.getChildByName(elem).attr('disabled', !checkbox.checked);

							if ($(label))
								if (checkbox.checked)
									$(label).removeClassName('text-muted');
								else
									$(label).addClassName('text-muted');

						},
						execute: function () {
							if (this.validate() && confirm(__("Save changes to selected feeds?"))) {
								const query = this.attr('value');

								/* normalize unchecked checkboxes because [] is not serialized */

								Object.keys(query).each((key) => {
									const val = query[key];

									if (typeof val == "object" && val.length == 0)
										query[key] = ["off"];
								});

								Notify.progress("Saving data...", true);

								xhrPost("backend.php", query, () => {
									dialog.hide();

									const tree = dijit.byId("feedTree");

									if (tree) tree.reload();
								});
							}
						},
						content: transport.responseText
					});

					dialog.show();
				} catch (e) {
					App.Error.report(e);
				}
			});
		},
		editCategory: function(id, item) {
			// uncategorized
			if (String(item.id) == "CAT:0")
				return;

			const new_name = prompt(__('Rename category to:'), item.name);

			if (new_name && new_name != item.name) {

				Notify.progress("Loading, please wait...");

				xhrPost("backend.php", { op: 'pref-feeds', method: 'renamecat', id: id, title: new_name }, () => {
					this.reload();
				});
			}
		},
		createCategory: function() {
			const title = prompt(__("Category title:"));

			if (title) {
				Notify.progress("Creating category...");

				xhrPost("backend.php", {op: "pref-feeds", method: "addCat", cat: title}, () => {
					Notify.close();
					this.reload();
				});
			}
		},
		batchSubscribe: function() {
			const dialog = new fox.SingleUseDialog({
				id: "batchSubDlg",
				title: __("Batch subscribe"),
				execute: function () {
					if (this.validate()) {
						Notify.progress(__("Subscribing to feeds..."), true);

						xhrPost("backend.php", this.attr('value'), () => {
							Notify.close();

							const tree = dijit.byId("feedTree");
							if (tree) tree.reload();

							dialog.hide();
						});
					}
				},
				content: __("Loading, please wait...")
			});

			const tmph = dojo.connect(dialog, 'onShow', function () {
				dojo.disconnect(tmph);

				xhrPost("backend.php", {op: 'pref-feeds', method: 'batchSubscribe'}, (transport) => {
					dialog.attr('content', transport.responseText);
				})
			});

			dialog.show();
		},
		showInactiveFeeds: function() {
			const dialog = new fox.SingleUseDialog({
				id: "inactiveFeedsDlg",
				title: __("Feeds without recent updates"),
				getSelectedFeeds: function () {
					return Tables.getSelected("inactive-feeds-list");
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

								const tree = dijit.byId("feedTree");
								if (tree) tree.reload();

								dialog.hide();
							});
						}

					} else {
						alert(__("No feeds selected."));
					}
				},
				content: __("Loading, please wait...")
			});

			const tmph = dojo.connect(dialog, 'onShow', function () {
				dojo.disconnect(tmph);

				xhrPost("backend.php", {op: "pref-feeds", method: "inactivefeeds"}, (transport) => {
					dialog.attr('content', transport.responseText);
				})
			});

			dialog.show();
		}
	});
});

