<?php
class Debug {
	const LOG_DISABLED = -1;
	const LOG_NORMAL = 0;
	const LOG_VERBOSE = 1;
	const LOG_EXTENDED = 2;

	const ALL_LOG_LEVELS = [
		Debug::LOG_DISABLED,
		Debug::LOG_NORMAL,
		Debug::LOG_VERBOSE,
		Debug::LOG_EXTENDED,
	];

	// TODO: class properties can be switched to PHP typing if/when the minimum PHP_VERSION is raised to 7.4.0+
	/**
	 * @deprecated
	 * @var int
	*/
	public static $LOG_DISABLED = self::LOG_DISABLED;

	/**
	 * @deprecated
	 * @var int
	*/
	public static $LOG_NORMAL = self::LOG_NORMAL;

	/**
	 * @deprecated
	 * @var int
	*/
	public static $LOG_VERBOSE = self::LOG_VERBOSE;

	/**
	 * @deprecated
	 * @var int
	*/
	public static $LOG_EXTENDED = self::LOG_EXTENDED;

	/** @var bool */
	private static $enabled = false;

	/** @var bool */
	private static $quiet = false;

	/** @var string|null */
	private static $logfile = null;

	/**
	 * @var int Debug::LOG_*
	 */
    private static $loglevel = self::LOG_NORMAL;

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
    public static function set_loglevel($level): void {
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
			/** @phpstan-ignore-next-line */
			return $level;
		} else {
			user_error("Passed invalid debug log level: $level", E_USER_WARNING);
			return self::LOG_DISABLED;
		}
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

        print "[$ts] $message\n";

		return true;
    }
}
