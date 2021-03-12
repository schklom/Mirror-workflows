<?php
class Pref_Users extends Handler_Administrative {
		function csrf_ignore($method) {
			return $method == "index";
		}

		function edit() {
			$user = ORM::for_table('ttrss_users')
				->select_expr("id,login,access_level,email,full_name,otp_enabled")
				->find_one((int)$_REQUEST["id"])
				->as_array();

			global $access_level_names;

			if ($user) {
				print json_encode([
					"user" => $user,
					"access_level_names" => $access_level_names
				]);
			}
		}

		function userdetails() {
			$id = (int) clean($_REQUEST["id"]);

			$sth = $this->pdo->prepare("SELECT login,
				".SUBSTRING_FOR_DATE."(last_login,1,16) AS last_login,
				access_level,
				(SELECT COUNT(int_id) FROM ttrss_user_entries
					WHERE owner_uid = id) AS stored_articles,
				".SUBSTRING_FOR_DATE."(created,1,16) AS created
				FROM ttrss_users
				WHERE id = ?");
			$sth->execute([$id]);

			if ($row = $sth->fetch()) {

				$last_login = TimeHelper::make_local_datetime(
					$row["last_login"], true);

				$created = TimeHelper::make_local_datetime(
					$row["created"], true);

				$stored_articles = $row["stored_articles"];

				$sth = $this->pdo->prepare("SELECT COUNT(id) as num_feeds FROM ttrss_feeds
					WHERE owner_uid = ?");
				$sth->execute([$id]);
				$row = $sth->fetch();

				$num_feeds = $row["num_feeds"];

				?>

				<fieldset>
					<label><?= __('Registered') ?>:</label>
					<?= $created ?>
				</fieldset>

				<fieldset>
					<label><?= __('Last logged in') ?>:</label>
					<?= $last_login ?>
				</fieldset>

				<fieldset>
					<label><?= __('Subscribed feeds') ?>:</label>
					<?= $num_feeds ?>
				</fieldset>

				<fieldset>
					<label><?= __('Stored articles') ?>:</label>
					<?= $stored_articles ?>
				</fieldset>

				<?php
					$sth = $this->pdo->prepare("SELECT id,title,site_url FROM ttrss_feeds
						WHERE owner_uid = ? ORDER BY title");
					$sth->execute([$id]);
				?>

				<ul class="panel panel-scrollable list list-unstyled">
					<?php while ($row = $sth->fetch()) { ?>
						<li>
							<?php
								$icon_file = Config::get(Config::ICONS_URL) . "/" . $row["id"] . ".ico";
								$icon = file_exists($icon_file) ? $icon_file : "images/blank_icon.gif";
							?>

							<img class="icon" src="<?= $icon_file ?>">

							<a target="_blank" href="<?= htmlspecialchars($row["site_url"]) ?>">
								<?= htmlspecialchars($row["title"]) ?>
							</a>
						</li>
					<?php } ?>
				</ul>

				<?php

			} else {
				print_error(__('User not found'));
			}

		}

		function editSave() {
			$id = (int)$_REQUEST['id'];
			$password = clean($_REQUEST["password"]);
			$user = ORM::for_table('ttrss_users')->find_one($id);

			if ($user) {
				$login = clean($_REQUEST["login"]);

				if ($id == 1) $login = "admin";
				if (!$login) return;

				$user->login = mb_strtolower($login);
				$user->access_level = (int) clean($_REQUEST["access_level"]);
				$user->email = clean($_REQUEST["email"]);
				$user->otp_enabled = checkbox_to_sql_bool($_REQUEST["otp_enabled"] ?? "");

				// force new OTP secret when next enabled
				if (Config::get_schema_version() >= 143 && !$user->otp_enabled) {
					$user->otp_secret = null;
				}

				$user->save();
			}

			if ($password) {
				UserHelper::reset_password($id, false, $password);
			}
		}

		function remove() {
			$ids = explode(",", clean($_REQUEST["ids"]));

			foreach ($ids as $id) {
				if ($id != $_SESSION["uid"] && $id != 1) {
					$sth = $this->pdo->prepare("DELETE FROM ttrss_tags WHERE owner_uid = ?");
					$sth->execute([$id]);

					$sth = $this->pdo->prepare("DELETE FROM ttrss_feeds WHERE owner_uid = ?");
					$sth->execute([$id]);

					$sth = $this->pdo->prepare("DELETE FROM ttrss_users WHERE id = ?");
					$sth->execute([$id]);
				}
			}
		}

		function add() {
			$login = clean($_REQUEST["login"]);

			if (!$login) return; // no blank usernames

			if (!UserHelper::find_user_by_login($login)) {

				$new_password = make_password();

				$user = ORM::for_table('ttrss_users')->create();

				$user->salt = UserHelper::get_salt();
				$user->login = mb_strtolower($login);
				$user->pwd_hash = UserHelper::hash_password($new_password, $user->salt);
				$user->access_level = 0;
				$user->created = Db::NOW();
				$user->save();

				if ($new_uid = UserHelper::find_user_by_login($login)) {
					print T_sprintf("Added user %s with password %s",
						$login, $new_password);
				} else {
					print T_sprintf("Could not create user %s", $login);
				}
			} else {
				print T_sprintf("User %s already exists.", $login);
			}
		}

		function resetPass() {
			UserHelper::reset_password(clean($_REQUEST["id"]));
		}

		function index() {

			global $access_level_names;

			$user_search = clean($_REQUEST["search"] ?? "");

			if (array_key_exists("search", $_REQUEST)) {
				$_SESSION["prefs_user_search"] = $user_search;
			} else {
				$user_search = ($_SESSION["prefs_user_search"] ?? "");
			}

			$sort = clean($_REQUEST["sort"] ?? "");

			if (!$sort || $sort == "undefined") {
				$sort = "login";
			}

			if (!in_array($sort, ["login", "access_level", "created", "num_feeds", "created", "last_login"]))
				$sort = "login";

			if ($sort != "login") $sort = "$sort DESC";
			?>

			<div dojoType='dijit.layout.BorderContainer' gutters='false'>
				<div style='padding : 0px' dojoType='dijit.layout.ContentPane' region='top'>
					<div dojoType='fox.Toolbar'>

						<div style='float : right'>
							<input dojoType='dijit.form.TextBox' id='user_search' size='20' type='search'
								value="<?= htmlspecialchars($user_search) ?>">
							<button dojoType='dijit.form.Button' onclick='Users.reload()'>
								<?= __('Search') ?>
							</button>
						</div>

						<div dojoType='fox.form.DropDownButton'>
							<span><?= __('Select') ?></span>
							<div dojoType='dijit.Menu' style='display: none'>
								<div onclick="Tables.select('users-list', true)"
									dojoType='dijit.MenuItem'><?= __('All') ?></div>
								<div onclick="Tables.select('users-list', false)"
									dojoType='dijit.MenuItem'><?= __('None') ?></div>
								</div>
							</div>

						<button dojoType='dijit.form.Button' onclick='Users.add()'>
							<?= __('Create user') ?>
						</button>

						<button dojoType='dijit.form.Button' onclick='Users.removeSelected()'>
							<?= __('Remove') ?>
						</button>

						<button dojoType='dijit.form.Button' onclick='Users.resetSelected()'>
							<?= __('Reset password') ?>
						</button>

						<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB_SECTION, "prefUsersToolbar") ?>

					</div>
				</div>
				<div style='padding : 0px' dojoType='dijit.layout.ContentPane' region='center'>

					<table width='100%' class='users-list' id='users-list'>

						<tr>
							<th></th>
							<th><a href='#' onclick="Users.reload('login')"><?= ('Login') ?></a></th>
							<th><a href='#' onclick="Users.reload('access_level')"><?= ('Access Level') ?></a></th>
							<th><a href='#' onclick="Users.reload('num_feeds')"><?= ('Subscribed feeds') ?></a></th>
							<th><a href='#' onclick="Users.reload('created')"><?= ('Registered') ?></a></th>
							<th><a href='#' onclick="Users.reload('last_login')"><?= ('Last login') ?></a></th>
						</tr>

						<?php
							$users = ORM::for_table('ttrss_users')
								->table_alias('u')
								->left_outer_join("ttrss_feeds", ["owner_uid", "=", "u.id"], 'f')
									->select_expr('u.*,COUNT(f.id) AS num_feeds')
									->where_like("login", $user_search ? "%$user_search%" : "%")
									->order_by_expr($sort)
									->group_by_expr('u.id')
									->find_many();

							foreach ($users as $user) { ?>

								<tr data-row-id='<?= $user["id"] ?>' onclick='Users.edit(<?= $user["id"] ?>)' title="<?= __('Click to edit') ?>">
									<td class='checkbox'>
										<input onclick='Tables.onRowChecked(this); event.stopPropagation();'
										dojoType='dijit.form.CheckBox' type='checkbox'>
									</td>

									<td width='30%'>
										<i class='material-icons'>person</i>
										<strong><?= htmlspecialchars($user["login"]) ?></strong>
									</td>
									<td><?= $access_level_names[$user["access_level"]] ?></td>
									<td><?= $user["num_feeds"] ?></td>
									<td class='text-muted'><?= TimeHelper::make_local_datetime($user["created"], false) ?></td>
									<td class='text-muted'><?= TimeHelper::make_local_datetime($user["last_login"], false) ?></td>
								</tr>
						<?php } ?>
					</table>
				</div>
				<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB, "prefUsers") ?>
			</div>
		<?php
	}

}
