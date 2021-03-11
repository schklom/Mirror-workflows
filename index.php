<?php

	// we need a separate check here because functions.php might get parsed
	// incorrectly before 5.3 because of :: syntax.
	if (version_compare(PHP_VERSION, '7.0.0', '<')) {
		print "<b>Fatal Error</b>: PHP version 7.0.0 or newer required. You're using " . PHP_VERSION . ".\n";
		exit;
	}

	set_include_path(__DIR__ ."/include" . PATH_SEPARATOR .
		get_include_path());

	require_once "autoload.php";
	require_once "sessions.php";
	require_once "functions.php";

	Config::sanity_check();

	if (!init_plugins()) return;

	UserHelper::login_sequence();

	header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
	<title>Tiny Tiny RSS</title>
    <meta name="viewport" content="initial-scale=1,width=device-width" />

	<?php if ($_SESSION["uid"] && empty($_SESSION["safe_mode"])) {
		$theme = get_pref(Prefs::USER_CSS_THEME);
		if ($theme && theme_exists("$theme")) {
			echo stylesheet_tag(get_theme_path($theme), ['id' => 'theme_css']);
		}
	} ?>

	<?= Config::get_override_links() ?>

	<script type="text/javascript">
		const __csrf_token = "<?= $_SESSION["csrf_token"]; ?>";
	</script>

	<?php UserHelper::print_user_stylesheet() ?>

	<style type="text/css">
	<?php
		foreach (PluginHost::getInstance()->get_plugins() as $n => $p) {
			if (method_exists($p, "get_css")) {
				echo $p->get_css();
			}
		}
	?>
	</style>

	<link rel="shortcut icon" type="image/png" href="images/favicon.png"/>
	<link rel="icon" type="image/png" sizes="72x72" href="images/favicon-72px.png" />

	<script>
		dojoConfig = {
			async: true,
			cacheBust: "<?= get_scripts_timestamp(); ?>",
			packages: [
				{ name: "fox", location: "../../js" },
			]
		};
	</script>

	<?php
	foreach (["lib/dojo/dojo.js",
				"lib/dojo/tt-rss-layer.js",
				"js/tt-rss.js",
				"js/common.js"] as $jsfile) {

		echo javascript_tag($jsfile);

	} ?>

	<script type="text/javascript">
		require({cache:{}});
	</script>

	<script type="text/javascript">
	<?php
		foreach (PluginHost::getInstance()->get_plugins() as $n => $p) {
			if (method_exists($p, "get_js")) {
			    $script = $p->get_js();

			    if ($script) {
					echo "try {
					    $script
					} catch (e) {
                        console.warn('failed to initialize plugin JS: $n', e);
                    }";
				}
			}
		}
	?>
	</script>

	<style type="text/css">
		@media (prefers-color-scheme: dark) {
			body {
				background : #303030;
			}
		}

		body.css_loading * {
			display : none;
		}
	</style>

	<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
	<meta name="referrer" content="no-referrer"/>
</head>

<body class="flat ttrss_main ttrss_index css_loading">

<div id="overlay" style="display : block">
	<div id="overlay_inner">
		<?= __("Loading, please wait...") ?>
		<div dojoType="dijit.ProgressBar" places="0" style="width : 300px" id="loading_bar"
	     progress="0" maximum="100">
		</div>
		<noscript><br/><?php print_error('Javascript is disabled. Please enable it.') ?></noscript>
	</div>
</div>

<div id="notify" class="notify"></div>
<div id="cmdline" style="display : none"></div>

<div id="main" dojoType="dijit.layout.BorderContainer">
    <div id="feeds-holder" dojoType="dijit.layout.ContentPane" region="leading" style="width : 20%" splitter="true">
        <div id="feedlistLoading">
            <img src='images/indicator_tiny.gif'/>
            <?= __("Loading, please wait..."); ?></div>
        <?php
			 PluginHost::getInstance()->run_hooks_callback(PluginHost::HOOK_FEED_TREE, function ($result) {
				 echo $result;
			 });
        ?>
        <div id="feedTree"></div>
    </div>

    <div dojoType="dijit.layout.BorderContainer" region="center" id="content-wrap">
        <div id="toolbar-frame" dojoType="dijit.layout.ContentPane" region="top">
            <div id="toolbar" dojoType="fox.Toolbar">

            <i class="material-icons net-alert" style="display : none"
                title="<?= __("Communication problem with server.") ?>">error_outline</i>

            <i class="material-icons log-alert" style="display : none" onclick="App.openPreferences('system')"
                 title="<?= __("Recent entries found in event log.") ?>">warning</i>

            <i id="updates-available" class="material-icons icon-new-version" style="display : none"
               title="<?= __('Updates are available from Git.') ?>">new_releases</i>

            <?php

            PluginHost::getInstance()->run_hooks_callback(PluginHost::HOOK_MAIN_TOOLBAR_BUTTON, function ($result) {
                echo $result;
				});
            ?>

            <div id="toolbar-headlines" dojoType="fox.Toolbar" style="order : 10">

            </div>

            <form id="toolbar-main" dojoType="dijit.form.Form" action="" style="order : 20" onsubmit="return false">

            <select name="view_mode" title="<?= __('Show articles') ?>"
                onchange="Feeds.onViewModeChanged()"
                dojoType="fox.form.Select">
                <option selected="selected" value="adaptive"><?= __('Adaptive') ?></option>
                <option value="all_articles"><?= __('All Articles') ?></option>
                <option value="marked"><?= __('Starred') ?></option>
                <option value="published"><?= __('Published') ?></option>
                <option value="unread"><?= __('Unread') ?></option>
                <option value="has_note"><?= __('With Note') ?></option>
            </select>

			<select title="<?= __('Sort articles') ?>"
                onchange="Feeds.onViewModeChanged()"
                dojoType="fox.form.Select" name="order_by">

				<option selected="selected" value="default"><?= __('Default') ?></option>
                <option value="feed_dates"><?= __('Newest first') ?></option>
                <option value="date_reverse"><?= __('Oldest first') ?></option>
                <option value="title"><?= __('Title') ?></option>

				<?php
					PluginHost::getInstance()->run_hooks_callback(PluginHost::HOOK_HEADLINES_CUSTOM_SORT_MAP, function ($result) {
						foreach ($result as $sort_value => $sort_title) {
							print "<option value=\"" . htmlspecialchars($sort_value) . "\">$sort_title</option>";
						}
					});
				?>
            </select>

            <div class="catchup-button" dojoType="fox.form.ComboButton" onclick="Feeds.catchupCurrent()">
                <span><?= __('Mark as read') ?></span>
                <div dojoType="dijit.DropDownMenu">
                    <div dojoType="dijit.MenuItem" onclick="Feeds.catchupCurrent('1day')">
                        <?= __('Older than one day') ?>
                    </div>
                    <div dojoType="dijit.MenuItem" onclick="Feeds.catchupCurrent('1week')">
                        <?= __('Older than one week') ?>
                    </div>
                    <div dojoType="dijit.MenuItem" onclick="Feeds.catchupCurrent('2week')">
                        <?= __('Older than two weeks') ?>
                    </div>
                </div>
            </div>

            </form>

            <div class="action-chooser" style="order : 30">

                <?php
						  PluginHost::getInstance()->run_hooks_callback(PluginHost::HOOK_TOOLBAR_BUTTON, function ($result) {
							echo $result;
						});
                ?>

                <div dojoType="fox.form.DropDownButton" class="action-button" title="<?= __('Actions...') ?>">
					<span><i class="material-icons">menu</i></span>
                    <div dojoType="dijit.Menu" style="display: none">
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcPrefs')"><?= __('Preferences...') ?></div>
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcSearch')"><?= __('Search...') ?></div>
                        <div dojoType="dijit.MenuItem" disabled="1"><?= __('Feed actions:') ?></div>
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcAddFeed')"><?= __('Subscribe to feed...') ?></div>
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcEditFeed')"><?= __('Edit this feed...') ?></div>
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcRemoveFeed')"><?= __('Unsubscribe') ?></div>
                        <div dojoType="dijit.MenuItem" disabled="1"><?= __('All feeds:') ?></div>
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcCatchupAll')"><?= __('Mark as read') ?></div>
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcShowOnlyUnread')"><?= __('(Un)hide read feeds') ?></div>
                        <div dojoType="dijit.MenuItem" disabled="1"><?= __('Other actions:') ?></div>
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcToggleWidescreen')"><?= __('Toggle widescreen mode') ?></div>
                        <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcHKhelp')"><?= __('Keyboard shortcuts help') ?></div>

                        <?php
									PluginHost::getInstance()->run_hooks_callback(PluginHost::HOOK_ACTION_ITEM, function ($result) {
										echo $result;
									});
                        ?>

                        <?php if (empty($_SESSION["hide_logout"])) { ?>
                            <div dojoType="dijit.MenuItem" onclick="App.onActionSelected('qmcLogout')"><?= __('Logout') ?></div>
                        <?php } ?>
                    </div>
                </div>
            </div>
        </div> <!-- toolbar -->
        </div> <!-- toolbar pane -->
        <div id="headlines-wrap-inner" dojoType="dijit.layout.BorderContainer" region="center">
            <div id="headlines-frame" dojoType="dijit.layout.ContentPane" tabindex="0"
                    region="center">
                <div id="headlinesInnerContainer">
                    <div class="whiteBox"><?= __('Loading, please wait...') ?></div>
                </div>
            </div>
            <div id="content-insert" dojoType="dijit.layout.ContentPane" region="bottom"
                style="height : 50%" splitter="true"></div>
        </div>
    </div>
</div>

</body>
</html>
