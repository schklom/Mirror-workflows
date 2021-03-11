<?php
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
	<title>Tiny Tiny RSS : <?= __("Preferences") ?></title>
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

	<link rel="shortcut icon" type="image/png" href="images/favicon.png"/>
	<link rel="icon" type="image/png" sizes="72x72" href="images/favicon-72px.png" />

	<script>
		dojoConfig = {
			async: true,
			cacheBust: "<?= get_scripts_timestamp(); ?>",
			packages: [
				{ name: "lib", location: "../" },
				{ name: "fox", location: "../../js" },
			]
		};
	</script>

	<?php
	foreach (["lib/dojo/dojo.js",
				"lib/dojo/tt-rss-layer.js",
				"js/common.js",
				"js/prefs.js"] as $jsfile) {

		echo javascript_tag($jsfile);

	} ?>

    <script type="text/javascript">
		require({cache:{}});
    </script>

	<script type="text/javascript">
	<?php
		foreach (PluginHost::getInstance()->get_plugins() as $n => $p) {
			if (method_exists($p, "get_prefs_js")) {
				$script = $p->get_prefs_js();

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
</head>

<body class="flat ttrss_main ttrss_prefs css_loading">

<div id="notify" class="notify"></div>
<div id="cmdline" style="display : none"></div>

<div id="overlay">
	<div id="overlay_inner">
		<?= __("Loading, please wait...") ?>
		<div dojoType="dijit.ProgressBar" places="0" style="width : 300px" id="loading_bar"
	     progress="0" maximum="100">
		</div>
		<noscript><br/><?php print_error('Javascript is disabled. Please enable it.') ?></noscript>
	</div>
</div>

<div id="header">
	<i class="material-icons net-alert" style="display : none"
   	title="<?= __("Communication problem with server.") ?>">error_outline</i>
	<i class="material-icons log-alert" style="display : none" onclick="App.openPreferences('system')"
		title="<?= __("Recent entries found in event log.") ?>">warning</i>
	<i id="updates-available" class="material-icons icon-new-version" style="display : none">new_releases</i>
	<a href="#" onclick="document.location.href = 'index.php'"><?= __('Exit preferences') ?></a>
</div>

<div id="main" dojoType="dijit.layout.BorderContainer">
    <div dojoType="dijit.layout.TabContainer" region="center" id="pref-tabs">
        <div id="prefsTab" dojoType="dijit.layout.ContentPane"
            href="backend.php?op=pref-prefs"
            title="<i class='material-icons'>settings</i> <?= __('Preferences') ?>"></div>
        <div id="feedsTab" dojoType="dijit.layout.ContentPane"
            href="backend.php?op=pref-feeds"
            title="<i class='material-icons'>rss_feed</i>  <?= __('Feeds') ?>"></div>
        <div id="filtersTab" dojoType="dijit.layout.ContentPane"
            style="padding : 0px"
            href="backend.php?op=pref-filters"
            title="<i class='material-icons'>filter_list1</i> <?= __('Filters') ?>"></div>
        <div id="labelsTab" dojoType="dijit.layout.ContentPane"
            style="padding : 0px"
            href="backend.php?op=pref-labels"
            title="<i class='material-icons'>label_outline1</i> <?= __('Labels') ?>"></div>
        <?php if ($_SESSION["access_level"] >= 10) { ?>
            <div id="usersTab" dojoType="dijit.layout.ContentPane"
                style="padding : 0px"
                href="backend.php?op=pref-users"
                title="<i class='material-icons'>person</i> <?= __('Users') ?>"></div>
            <div id="systemTab" dojoType="dijit.layout.ContentPane"
                href="backend.php?op=pref-system"
                title="<i class='material-icons'>info_outline</i> <?= __('System') ?>"></div>
        <?php } ?>
        <?php
            PluginHost::getInstance()->run_hooks(PluginHost::HOOK_PREFS_TABS);
        ?>
        </div>
		<div id="footer" dojoType="dijit.layout.ContentPane" region="bottom">
			<a class="text-muted" target="_blank" href="https://tt-rss.org/">Tiny Tiny RSS</a>
				<span>v<?= Config::get_version() ?></span>
				&copy; 2005-<?= date('Y') ?>
			<a class="text-muted" target="_blank" href="https://fakecake.org/">Andrew Dolgov</a>
    </div>
</div>

</body>
</html>
