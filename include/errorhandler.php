<?php
/**
 * @param array<int, array<string, mixed>> $trace
 */
function format_backtrace(array $trace): string {
	$rv = "";
	$idx = 1;

	foreach ($trace as $e) {
		if (isset($e["file"]) && isset($e["line"])) {
			$fmt_args = [];

			if (is_array($e["args"] ?? false)) {
				foreach ($e["args"] as $a) {
					if (is_object($a))
						$fmt_args[] = '{' . $a::class . '}';
					elseif (is_array($a))
						$fmt_args[] = '[' . truncate_string(json_encode($a), 256, '...') . ']';
					elseif (is_resource($a))
						$fmt_args[] = truncate_string(get_resource_type($a), 256, '...');
					elseif (is_string($a))
						$fmt_args[] = truncate_string($a, 256, '...');
				}
			}

			$filename = str_replace(dirname(__DIR__) . "/", "", $e["file"]);

			$rv .= sprintf("%d. %s(%s): %s(%s)\n",
				$idx,
				$filename,
				$e["line"],
				$e["function"],
				implode(", ", $fmt_args));

			$idx++;
		}
	}

	return $rv;
}

function ttrss_error_handler(int $errno, string $errstr, string $file, int $line): bool {
	// return true in order to avoid default error handling by PHP
	if (!(error_reporting() & $errno)) return true;

	$file = substr(str_replace(dirname(__DIR__), "", $file), 1);

	$context = format_backtrace(debug_backtrace());
	$errstr = truncate_middle($errstr, 16384, " (...) ");

	if (php_sapi_name() == 'cli' && class_exists("Debug")) {
		Debug::log("!! Exception: $errstr ($file:$line)");
		Debug::log($context);
	}

	if (class_exists("Logger"))
		return Logger::log_error((int)$errno, $errstr, $file, (int)$line, $context);
	else
		return false;
}

function ttrss_fatal_handler(): bool {
	$error = error_get_last();

	if ($error !== NULL) {
		$errno = $error["type"];
		$file = $error["file"];
		$line = $error["line"];
		$errstr  = $error["message"];

		if (!$errno) return false;

		$context = format_backtrace(debug_backtrace());

		$file = substr(str_replace(dirname(__DIR__), "", $file), 1);

		if (php_sapi_name() == 'cli' && class_exists("Debug")) {
			Debug::log("!! Fatal error: $errstr ($file:$line)");
			Debug::log($context);
		}

		if (class_exists("Logger"))
			Logger::log_error((int)$errno, $errstr, $file, (int)$line, $context);

		if (php_sapi_name() == 'cli')
			exit(1);
	}

	return false;
}

register_shutdown_function(ttrss_fatal_handler(...));
set_error_handler(ttrss_error_handler(...));

