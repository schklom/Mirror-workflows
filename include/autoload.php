<?php
	spl_autoload_register(function($class) {

		$root_dir = dirname(__DIR__); // we were in tt-rss/include

		// - internal tt-rss classes are loaded from classes/ and use special naming logic instead of namespaces
		// - plugin classes are loaded by PluginHandler from plugins.local/ and plugins/

		$class_file = "$root_dir/classes/" . str_replace("_", "/", strtolower($class)) . ".php";

		if (file_exists($class_file))
			include $class_file;

	});

	// also pull composer autoloader
	require_once "vendor/autoload.php";
