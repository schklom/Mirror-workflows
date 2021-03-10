<?php
class Logger {
	private static $instance;
	private $adapter;

	const LOG_DEST_SQL = "sql";
	const LOG_DEST_STDOUT = "stdout";
	const LOG_DEST_SYSLOG = "syslog";

	const ERROR_NAMES = [
		1			=> 'E_ERROR',
		2			=> 'E_WARNING',
		4			=> 'E_PARSE',
		8			=> 'E_NOTICE',
		16			=> 'E_CORE_ERROR',
		32			=> 'E_CORE_WARNING',
		64			=> 'E_COMPILE_ERROR',
		128		=> 'E_COMPILE_WARNING',
		256		=> 'E_USER_ERROR',
		512		=> 'E_USER_WARNING',
		1024		=> 'E_USER_NOTICE',
		2048		=> 'E_STRICT',
		4096		=> 'E_RECOVERABLE_ERROR',
		8192		=> 'E_DEPRECATED',
		16384		=> 'E_USER_DEPRECATED',
		32767		=> 'E_ALL'];

	static function log_error(int $errno, string $errstr, string $file, int $line, $context) {
		return self::get_instance()->_log_error($errno, $errstr, $file, $line, $context);
	}

	private function _log_error($errno, $errstr, $file, $line, $context) {
		//if ($errno == E_NOTICE) return false;

		if ($this->adapter)
			return $this->adapter->log_error($errno, $errstr, $file, $line, $context);
		else
			return false;
	}

	static function log(int $errno, string $errstr, $context = "") {
		return self::get_instance()->_log($errno, $errstr, $context);
	}

	private function _log(int $errno, string $errstr, $context = "") {
		if ($this->adapter)
			return $this->adapter->log_error($errno, $errstr, '', 0, $context);
		else
			return user_error($errstr, $errno);
	}

	private function __clone() {
		//
	}

	function __construct() {
		switch (Config::get(Config::LOG_DESTINATION)) {
		case self::LOG_DEST_SQL:
			$this->adapter = new Logger_SQL();
			break;
		case self::LOG_DEST_SYSLOG:
			$this->adapter = new Logger_Syslog();
			break;
		case self::LOG_DEST_STDOUT:
			$this->adapter = new Logger_Stdout();
			break;
		default:
			$this->adapter = false;
		}

		if ($this->adapter && !implements_interface($this->adapter, "Logger_Adapter"))
			user_error("Adapter for LOG_DESTINATION: " . Config::LOG_DESTINATION . " does not implement required interface.", E_USER_ERROR);
	}

	private static function get_instance() : Logger {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

	static function get() : Logger {
		user_error("Please don't use Logger::get(), call Logger::log(...) instead.", E_USER_DEPRECATED);
		return self::get_instance();
	}
}
