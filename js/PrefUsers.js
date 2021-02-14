'use strict'

/* global __  */
/* global xhrPost, xhrJson, dojo, dijit, Notify, Tables, App, fox */

const	Users = {
	reload: function(sort) {
		const user_search = $("user_search");
		const search = user_search ? user_search.value : "";

		xhrPost("backend.php", { op: "pref-users", sort: sort, search: search }, (transport) => {
			dijit.byId('usersTab').attr('content', transport.responseText);
			Notify.close();
		});
	},
	add: function() {
		const login = prompt(__("Please enter username:"), "");

		if (login) {
			Notify.progress("Adding user...");

			xhrPost("backend.php", {op: "pref-users", method: "add", login: login}, (transport) => {
				alert(transport.responseText);
				Users.reload();
			});

		}
	},
	edit: function(id) {
		xhrJson('backend.php', {op: 'pref-users', method: 'edit', id: id}, (reply) => {
			const user = reply.user;
			const is_disabled = (user.id == 1) ? "disabled='disabled'" : '';

			const dialog = new fox.SingleUseDialog({
				id: "userEditDlg",
				title: __("User Editor"),
				execute: function () {
					if (this.validate()) {
						Notify.progress("Saving data...", true);

						xhrPost("backend.php", this.attr('value'), () => {
							dialog.hide();
							Users.reload();
						});
					}
				},
				content: `
					<form onsubmit='return false'>

						${App.FormFields.hidden('id', user.id.toString())}
						${App.FormFields.hidden('op', 'pref-users')}
						${App.FormFields.hidden('method', 'editSave')}

						<div dojoType="dijit.layout.TabContainer" style="height : 400px">
							<div dojoType="dijit.layout.ContentPane" title="${__('Edit user')}">

								<header>${__("User")}</header>

								<section>
									<fieldset>
										<label>${__("Login:")}</label>
										<input style='font-size : 16px'
											${is_disabled}
											dojoType='dijit.form.ValidationTextBox' required='1'
											name='login' value="${App.escapeHtml(user.login)}">

										${is_disabled ? App.FormFields.hidden("login", user.login) : ''}
									</fieldset>
								</section>

								<header>${__("Authentication")}</header>

								<section>
									<fieldset>
										<label>${__('Access level: ')}</label>
										${App.FormFields.select_hash("access_level",
											user.access_level, reply.access_level_names, is_disabled)}

										${is_disabled ? App.FormFields.hidden("access_level",
											user.access_level.toString()) : ''}
									</fieldset>
									<fieldset>
										<label>${__("New password:")}</label>
										<input dojoType='dijit.form.TextBox' type='password' size='20'
											placeholder='${__("Change password")}' name='password'>
									</fieldset>
								</section>

								<header>${__("Options")}</header>

								<section>
									<fieldset>
										<label>${__("E-mail:")}</label>
										<input dojoType='dijit.form.TextBox' size='30' name='email'
											value="${App.escapeHtml(user.email)}">
									</fieldset>
								</section>
							</div>
							<div dojoType="dijit.layout.ContentPane" title="${__('User details')}">
								<script type='dojo/method' event='onShow' args='evt'>
									if (this.domNode.querySelector('.loading')) {
										xhrPost("backend.php", {op: 'pref-users', method: 'userdetails', id: ${user.id}}, (transport) => {
											this.attr('content', transport.responseText);
										});
									}
								</script>
								<span class='loading'>${__("Loading, please wait...")}</span>
							</div>
						</div>

						<footer>
							<button dojoType='dijit.form.Button' class='alt-primary' type='submit' onclick='App.dialogOf(this).execute()'>
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
	resetSelected: function() {
		const rows = this.getSelection();

		if (rows.length == 0) {
			alert(__("No users selected."));
			return;
		}

		if (rows.length > 1) {
			alert(__("Please select one user."));
			return;
		}

		if (confirm(__("Reset password of selected user?"))) {
			Notify.progress("Resetting password for selected user...");

			const id = rows[0];

			xhrPost("backend.php", {op: "pref-users", method: "resetPass", id: id}, (transport) => {
				Notify.close();
				Notify.info(transport.responseText, true);
			});

		}
	},
	removeSelected: function() {
		const sel_rows = this.getSelection();

		if (sel_rows.length > 0) {
			if (confirm(__("Remove selected users? Neither default admin nor your account will be removed."))) {
				Notify.progress("Removing selected users...");

				const query = {
					op: "pref-users", method: "remove",
					ids: sel_rows.toString()
				};

				xhrPost("backend.php", query, () => {
					this.reload();
				});
			}

		} else {
			alert(__("No users selected."));
		}
	},
	getSelection :function() {
		return Tables.getSelected("users-list");
	}
}

