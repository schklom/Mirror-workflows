<?php
class Debug {
	public static $LOG_DISABLED = -1;
    public static $LOG_NORMAL = 0;
    public static $LOG_VERBOSE = 1;
    public static $LOG_EXTENDED = 2;

    private static $enabled = false;
    private static $quiet = false;
    private static $logfile = false;
    private static $loglevel = 0;

	public static function set_logfile($logfile) {
        self::$logfile = $logfile;
    }

    public static function enabled() {
        return self::$enabled;
    }

    public static function set_enabled($enable) {
        self::$enabled = $enable;
    }

    public static function set_quiet($quiet) {
        self::$quiet = $quiet;
    }

    public static function set_loglevel($level) {
        self::$loglevel = $level;
    }

    public static function get_loglevel() {
        return self::$loglevel;
    }

    public static function log($message, $level = 0) {

        if (!self::$enabled || self::$loglevel < $level) return false;

        $ts = strftime("%H:%M:%S", time());
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
                        return;
                    }
                }

                fputs($fp, "[$ts] $message\n");

                if (function_exists("flock")) {
                    flock($fp, LOCK_UN);
                }

                fclose($fp);

                if (self::$quiet)
                    return;

            } else {
                user_error("Unable to open debugging log file: " . self::$logfile, E_USER_WARNING);
            }
        }

        print "[$ts] $message\n";
    }
}
