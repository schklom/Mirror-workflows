<?php
class Debug {
	const LOG_DISABLED = -1;
	const LOG_NORMAL = 0;
	const LOG_VERBOSE = 1;
	const LOG_EXTENDED = 2;

	const SEPARATOR = "<-{log-separator}->";

	const ALL_LOG_LEVELS = [
		Debug::LOG_DISABLED,
		Debug::LOG_NORMAL,
		Debug::LOG_VERBOSE,
		Debug::LOG_EXTENDED,
	];

	/**
	 * @deprecated
	*/
	public static int $LOG_DISABLED = self::LOG_DISABLED;

	/**
	 * @deprecated
	*/
	public static int $LOG_NORMAL = self::LOG_NORMAL;

	/**
	 * @deprecated
	*/
	public static int $LOG_VERBOSE = self::LOG_VERBOSE;

	/**
	 * @deprecated
	*/
	public static int $LOG_EXTENDED = self::LOG_EXTENDED;

	private static bool $enabled = false;
	private static bool $quiet = false;
	private static ?string $logfile = null;
	private static bool $enable_html = false;

	private static int $loglevel = self::LOG_NORMAL;

	public static function set_logfile(string $logfile): void {
        self::$logfile = $logfile;
    }

    public static function enabled(): bool {
        return self::$enabled;
    }

    public static function set_enabled(bool $enable): void {
        self::$enabled = $enable;
    }

    public static function set_quiet(bool $quiet): void {
        self::$quiet = $quiet;
    }

	/**
	 * @param Debug::LOG_* $level
	 */
    public static function set_loglevel(int $level): void {
        self::$loglevel = $level;
    }

	/**
	 * @return int Debug::LOG_*
	 */
    public static function get_loglevel(): int {
        return self::$loglevel;
    }

	/**
	 * @param int $level integer loglevel value
	 * @return Debug::LOG_* if valid, warn and return LOG_DISABLED otherwise
	 */
	public static function map_loglevel(int $level) : int {
		if (in_array($level, self::ALL_LOG_LEVELS)) {
			return $level;
		} else {
			user_error("Passed invalid debug log level: $level", E_USER_WARNING);
			return self::LOG_DISABLED;
		}
	}

	public static function enable_html(bool $enable) : void {
		self::$enable_html = $enable;
	}

	/**
	 * @param Debug::LOG_* $level log level
	 */
    public static function log(string $message, int $level = Debug::LOG_NORMAL): bool {

		if (!self::$enabled || self::$loglevel < $level) return false;

		$ts = date("H:i:s", time());
		if (function_exists('posix_getpid')) {
			$ts = "$ts/" . posix_getpid();
		}

		$orig_message = $message;

		if ($message === self::SEPARATOR) {
			$message = self::$enable_html ? "<hr/>" :
				"=================================================================================================================================";
		}

		if (self::$logfile) {
			$fp = fopen(self::$logfile, 'a+');

			if ($fp) {
					$locked = false;

					if (function_exists("flock")) {
						$tries = 0;

						// try to lock logfile for writing
						while ($tries < 5 && !$locked = flock($fp, LOCK_EX | LOCK_NB)) {
							sleep(1);
							++$tries;
						}

						if (!$locked) {
							fclose($fp);
							user_error("Unable to lock debugging log file: " . self::$logfile, E_USER_WARNING);
							return false;
						}
					}

					fputs($fp, "[$ts] $message\n");

					if (function_exists("flock")) {
						flock($fp, LOCK_UN);
					}

					fclose($fp);

					if (self::$quiet)
						return false;

			} else {
					user_error("Unable to open debugging log file: " . self::$logfile, E_USER_WARNING);
			}
		}

		if (self::$enable_html) {
			if ($orig_message === self::SEPARATOR) {
				print "$message\n";
			} else {
				print "<span class='log-timestamp'>$ts</span> <span class='log-message'>" . htmlspecialchars($message) . "</span>\n";
			}
		} else {
			print "[$ts] $message\n";
		}

		return true;
	}
}
