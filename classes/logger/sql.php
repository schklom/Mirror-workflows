<?php
class Logger_SQL implements Logger_Adapter {

	private $pdo;

	function log_error(int $errno, string $errstr, string $file, int $line, $context) {

		// separate PDO connection object is used for logging
		if (!$this->pdo) $this->pdo = Db::instance()->pdo_connect();

		if ($this->pdo && get_schema_version() > 117) {

			// limit context length, DOMDocument dumps entire XML in here sometimes, which may be huge
			$context = mb_substr($context, 0, 8192);

			$server_params = [
				"Real IP" => "HTTP_X_REAL_IP",
				"Forwarded For" => "HTTP_X_FORWARDED_FOR",
				"Forwarded Protocol" => "HTTP_X_FORWARDED_PROTO",
				"Remote IP" => "REMOTE_ADDR",
				"Request URI" => "REQUEST_URI",
				"User agent" => "HTTP_USER_AGENT",
			];

			foreach ($server_params as $n => $p) {
				if (isset($_SERVER[$p]))
					$context .= "\n$n: " . $_SERVER[$p];
			}

			// passed error message may contain invalid unicode characters, failing to insert an error here
			// would break the execution entirely by generating an actual fatal error instead of a E_WARNING etc
			$errstr = UConverter::transcode($errstr, 'UTF-8', 'UTF-8');
			$context = UConverter::transcode($context, 'UTF-8', 'UTF-8');

			// can't use $_SESSION["uid"] ?? null because what if its, for example, false? or zero?
			// this would cause a PDOException on insert below
			$owner_uid = !empty($_SESSION["uid"]) ? $_SESSION["uid"] : null;

			$sth = $this->pdo->prepare("INSERT INTO ttrss_error_log
				(errno, errstr, filename, lineno, context, owner_uid, created_at) VALUES
				(?, ?, ?, ?, ?, ?, NOW())");
			$sth->execute([$errno, $errstr, $file, (int)$line, $context, $owner_uid]);

			return $sth->rowCount();
		}

		return false;
	}

}
