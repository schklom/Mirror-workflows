<?php
	/*
	this is only needed because PHPStan can't figure out define_default()
	this file isn't sourced anywhere and only used for development
	*/

	define('SINGLE_USER_MODE', rand() % 2);
	define('LOCK_DIRECTORY', 'lock');

	define('FEED_FETCH_TIMEOUT', 45);
	// How may seconds to wait for response when requesting feed from a site
	define('FEED_FETCH_NO_CACHE_TIMEOUT', 15);
	// How may seconds to wait for response when requesting feed from a
	// site when that feed wasn't cached before
	define('FILE_FETCH_TIMEOUT', 45);
	// Default timeout when fetching files from remote sites
	define('FILE_FETCH_CONNECT_TIMEOUT', 15);
	// How many seconds to wait for initial response from website when
	// fetching files from remote sites
	define('DAEMON_UPDATE_LOGIN_LIMIT', 30);
	// stop updating feeds if users haven't logged in for X days
	define('DAEMON_FEED_LIMIT', 500);
	// feed limit for one update batch
	define('DAEMON_SLEEP_INTERVAL', 120);
	// default sleep interval between feed updates (sec)
	define('MAX_CACHE_FILE_SIZE', 64*1024*1024);
	// do not cache files larger than that (bytes)
	define('MAX_DOWNLOAD_FILE_SIZE', 16*1024*1024);
	// do not download general files larger than that (bytes)
	define('MAX_FAVICON_FILE_SIZE', 1*1024*1024);
	// do not download favicon files larger than that (bytes)
	define('CACHE_MAX_DAYS', 7);
	// max age in days for various automatically cached (temporary) files
	define('MAX_CONDITIONAL_INTERVAL', 3600*12);
	// max interval between forced unconditional updates for servers
	// not complying with http if-modified-since (seconds)
	// define('MAX_FETCH_REQUESTS_PER_HOST', 25);
	// a maximum amount of allowed HTTP requests per destination host
	// during a single update (i.e. within PHP process lifetime)
	// this is used to not cause excessive load on the origin server on
	// e.g. feed subscription when all articles are being processes
	// (not implemented)
	define('DAEMON_UNSUCCESSFUL_DAYS_LIMIT', 30);
	// automatically disable updates for feeds which failed to
	// update for this amount of days; 0 disables

