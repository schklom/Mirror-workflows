<?php
class Pref_Users extends Handler_Administrative {
		function csrf_ignore($method) {
			$csrf_ignored = array("index");

			return array_search($method, $csrf_ignored) !== false;
		}

		function edit() {
			global $access_level_names;

			$id = (int)clean($_REQUEST["id"]);

			$sth = $this->pdo->prepare("SELECT id, login, access_level, email FROM ttrss_users WHERE id = ?");
			$sth->execute([$id]);

			if ($row = $sth->fetch(PDO::FETCH_ASSOC)) {
				print json_encode([
						"user" => $row,
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
			$login = clean($_REQUEST["login"]);
			$uid = (int) clean($_REQUEST["id"]);
			$access_level = (int) clean($_REQUEST["access_level"]);
			$email = clean($_REQUEST["email"]);
			$password = clean($_REQUEST["password"]);

			// no blank usernames
			if (!$login) return;

			// forbid renaming admin
			if ($uid == 1) $login = "admin";

			$sth = $this->pdo->prepare("UPDATE ttrss_users SET login = LOWER(?),
					access_level = ?, email = ?, otp_enabled = false WHERE id = ?");
			$sth->execute([$login, $access_level, $email, $uid]);

			if ($password) {
				UserHelper::reset_password($uid, false, $password);
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
			$tmp_user_pwd = make_password();
			$salt = UserHelper::get_salt();
			$pwd_hash = UserHelper::hash_password($tmp_user_pwd, $salt, UserHelper::HASH_ALGOS[0]);

			if (!$login) return; // no blank usernames

			if (!UserHelper::find_user_by_login($login)) {

				$sth = $this->pdo->prepare("INSERT INTO ttrss_users
					(login,pwd_hash,access_level,last_login,created, salt)
					VALUES (LOWER(?), ?, 0, null, NOW(), ?)");
				$sth->execute([$login, $pwd_hash, $salt]);

				if ($new_uid = UserHelper::find_user_by_login($login)) {

					print T_sprintf("Added user %s with password %s",
						$login, $tmp_user_pwd);

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

			$sort = $this->_validate_field($sort,
				["login", "access_level", "created", "num_feeds", "created", "last_login"], "login");

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

						<tr class='title'>
							<td align='center' width='5%'> </td>
							<td width='20%'><a href='#' onclick="Users.reload('login')"><?= ('Login') ?></a></td>
							<td width='20%'><a href='#' onclick="Users.reload('access_level')"><?= ('Access Level') ?></a></td>
							<td width='10%'><a href='#' onclick="Users.reload('num_feeds')"><?= ('Subscribed feeds') ?></a></td>
							<td width='20%'><a href='#' onclick="Users.reload('created')"><?= ('Registered') ?></a></td>
							<td width='20%'><a href='#' onclick="Users.reload('last_login')"><?= ('Last login') ?></a></td>
						</tr>

						<?php
							$sth = $this->pdo->prepare("SELECT
									tu.id,
									login,access_level,email,
									".SUBSTRING_FOR_DATE."(last_login,1,16) as last_login,
									".SUBSTRING_FOR_DATE."(created,1,16) as created,
									(SELECT COUNT(id) FROM ttrss_feeds WHERE owner_uid = tu.id) AS num_feeds
								FROM
									ttrss_users tu
								WHERE
									(:search = '' OR login LIKE :search) AND tu.id > 0
								ORDER BY $sort");
							$sth->execute([":search" => $user_search ? "%$user_search%" : ""]);

							while ($row = $sth->fetch()) { ?>

								<tr data-row-id='<?= $row["id"] ?>' onclick='Users.edit(<?= $row["id"] ?>)' title="<?= __('Click to edit') ?>">
									<td align='center'>
										<input onclick='Tables.onRowChecked(this); event.stopPropagation();'
										dojoType='dijit.form.CheckBox' type='checkbox'>
									</td>

									<td><i class='material-icons'>person</i> <?= htmlspecialchars($row["login"]) ?></td>
									<td><?= $access_level_names[$row["access_level"]] ?></td>
									<td><?= $row["num_feeds"] ?></td>
									<td><?= TimeHelper::make_local_datetime($row["created"], false) ?></td>
									<td><?= TimeHelper::make_local_datetime($row["last_login"], false) ?></td>
								</tr>
						<?php } ?>
					</table>
				</div>
				<?php PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TAB, "prefUsers") ?>
			</div>
		<?php
	}

	private function _validate_field($string, $allowed, $default = "") {
			if (in_array($string, $allowed))
				return $string;
			else
				return $default;
		}

}
