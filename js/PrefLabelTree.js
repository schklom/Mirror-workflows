/* eslint-disable prefer-rest-params */
/* global __, define, lib, dijit, dojo, xhr, Notify, fox, App */

define(["dojo/_base/declare", "dojo/dom-construct", "lib/CheckBoxTree", "dijit/form/DropDownButton"], function (declare, domConstruct) {

	return declare("fox.PrefLabelTree", lib.CheckBoxTree, {
		setNameById: function (id, name) {
			const item = this.model.store._itemsByIdentity['LABEL:' + id];

			if (item)
				this.model.store.setValue(item, 'name', name);

		},
		_createTreeNode: function(args) {
			const tnode = this.inherited(arguments);

			//const fg_color = this.model.store.getValue(args.item, 'fg_color');
			//const bg_color = this.model.store.getValue(args.item, 'bg_color');
			const type = this.model.store.getValue(args.item, 'type');
			//const bare_id = this.model.store.getValue(args.item, 'bare_id');

			if (type == 'label') {
				const label = dojo.doc.createElement('i');
				//const fg_color = args.item.fg_color[0];
				const bg_color = String(args.item.bg_color);

				label.className = "material-icons icon-label";
				label.id = 'icon-label-' + String(args.item.bare_id);
				label.innerHTML = "label";
				label.setStyle({
					color: bg_color,
				});

				domConstruct.place(label, tnode.iconNode, 'before');

				//tnode._labelIconNode = span;
				//domConstruct.place(tnode._labelIconNode, tnode.labelNode, 'before');
			}

			return tnode;
		},
		getIconClass: function (item, opened) {
			// eslint-disable-next-line no-nested-ternary
			return (!item || this.model.mayHaveChildren(item)) ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "invisible";
		},
		getSelectedLabels: function() {
			const tree = this;
			const items = tree.model.getCheckedItems();
			const rv = [];

			items.forEach(function(item) {
				rv.push(tree.model.store.getValue(item, 'bare_id'));
			});

			return rv;
		},
		reload: function() {
			xhr.post("backend.php", { op: "pref-labels" }, (reply) => {
				dijit.byId('labelsTab').attr('content', reply);
				Notify.close();
			});
		},
		editLabel: function(id) {
			xhr.json("backend.php", {op: "pref-labels", method: "edit", id: id}, (reply) => {

				const fg_color = reply['fg_color'];
				const bg_color = reply['bg_color'] ? reply['bg_color'] : '#fff7d5';

				const dialog = new fox.SingleUseDialog({
					id: "labelEditDlg",
					title: __("Edit label"),
					setLabelColor: function (id, fg, bg) {

						let kind = '';
						let color = '';

						if (fg && bg) {
							kind = 'both';
						} else if (fg) {
							kind = 'fg';
							color = fg;
						} else if (bg) {
							kind = 'bg';
							color = bg;
						}

						const e = App.byId(`icon-label-${id}`);

						if (e) {
							if (bg) e.style.color = bg;
						}

						const query = {
							op: "pref-labels", method: "colorset", kind: kind,
							ids: id, fg: fg, bg: bg, color: color
						};

						xhr.post("backend.php", query, () => {
							const tree = dijit.byId("filterTree");
							if (tree) tree.reload(); // maybe there's labels in there
						});

					},
					execute: function () {
						if (this.validate()) {
							const caption = this.attr('value').caption;
							const fg_color = this.attr('value').fg_color;
							const bg_color = this.attr('value').bg_color;

							dijit.byId('labelTree').setNameById(id, caption);
							this.setLabelColor(id, fg_color, bg_color);
							this.hide();

							xhr.post("backend.php", this.attr('value'), () => {
								const tree = dijit.byId("filterTree");
								if (tree) tree.reload(); // maybe there's labels in there
							});
						}
					},
					content: `
						<form onsubmit='return false'>

						<section>
							<input style='font-size : 16px; width : 550px; color : ${fg_color}; background : ${bg_color}; transition : background 0.1s linear'
								id='labelEdit_caption'
								placeholder="${__("Caption")}"
								name='caption'
								dojoType='dijit.form.ValidationTextBox'
								required='true'
								value="${App.escapeHtml(reply.caption)}">
						</section>

						${App.FormFields.hidden_tag('id', id)}
						${App.FormFields.hidden_tag('op', 'pref-labels')}
						${App.FormFields.hidden_tag('method', 'save')}

						${App.FormFields.hidden_tag('fg_color', fg_color, {}, 'labelEdit_fgColor')}
						${App.FormFields.hidden_tag('bg_color', bg_color, {}, 'labelEdit_bgColor')}

						<section>
							<table width='100%'>
								<tr>
									<th>${__("Foreground:")}</th>
									<th>${__("Background:")}</th>
								</tr>
								<tr>
									<td class='text-center'>
										<div dojoType='dijit.ColorPalette'>
											<script type='dojo/method' event='onChange' args='fg_color'>
												dijit.byId('labelEdit_fgColor').attr('value', fg_color);
												dijit.byId('labelEdit_caption').domNode.setStyle({color: fg_color});
											</script>
										</div>
									</td>
									<td class='text-center'>
										<div dojoType='dijit.ColorPalette'>
											<script type='dojo/method' event='onChange' args='bg_color'>
												dijit.byId('labelEdit_bgColor').attr('value', bg_color);
												dijit.byId('labelEdit_caption').domNode.setStyle({backgroundColor: bg_color});
											</script>
										</div>
									</td>
								</tr>
							</table>
						</section>

						<footer>
							<button dojoType='dijit.form.Button' type='submit' class='alt-primary' onclick='App.dialogOf(this).execute()'>
								${App.FormFields.icon("save")}
								${__('Save')}
							</button>
							<button dojoType='dijit.form.Button' onclick='App.dialogOf(this).hide()'>
								${__('Cancel')}
							</button>
						</footer>

						</form>
					`
				});

				dialog.show();

			});
		},
		resetColors: function() {
			const labels = this.getSelectedLabels();

			if (labels.length > 0) {
				if (confirm(__("Reset selected labels to default colors?"))) {

					const query = {
						op: "pref-labels", method: "colorreset",
						ids: labels.toString()
					};

					xhr.post("backend.php", query, () => {
						this.reload();
					});
				}

			} else {
				alert(__("No labels selected."));
			}
		},
		removeSelected: function() {
			const sel_rows = this.getSelectedLabels();

			if (sel_rows.length > 0) {
				if (confirm(__("Remove selected labels?"))) {
					Notify.progress("Removing selected labels...");

					const query = {
						op: "pref-labels", method: "remove",
						ids: sel_rows.toString()
					};

					xhr.post("backend.php", query, () => {
						this.reload();
					});
				}
			} else {
				alert(__("No labels selected."));
			}

			return false;
		}
});

});


