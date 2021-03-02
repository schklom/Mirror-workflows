<?php
class Db_Updater {
	const SCHEMA_VERSION = 142;

	private $pdo;
	private $db_type;

	function __construct($pdo, $db_type) {
		$this->pdo = $pdo;
		$this->db_type = $db_type;
	}

	/** always returns actual (=uncached) value */
	private static function get_schema_version() {
		return Config::get_schema_version(true);
	}

	static function is_update_required() {
		return self::get_schema_version() < self::SCHEMA_VERSION;
	}

	function get_schema_lines($version) {
		$filename = "schema/versions/".$this->db_type."/$version.sql";

		if (file_exists($filename)) {
			return explode(";", (string)preg_replace("/[\r\n]/", "", (string)file_get_contents($filename)));
		} else {
			user_error("DB Updater: schema file for version $version is not found.");
			return false;
		}
	}

	function update_to($version, $html_output = true) {
		if ($this->get_schema_version() == $version - 1) {

			$lines = $this->get_schema_lines($version);

			if (is_array($lines)) {

				$this->pdo->beginTransaction();

				foreach ($lines as $line) {
					if (strpos($line, "--") !== 0 && $line) {

						if ($html_output)
							print "<pre>$line</pre>";
						else
							Debug::log("> $line");

						try {
							$this->pdo->query($line); // PDO returns errors as exceptions now
						} catch (PDOException $e) {
							if ($html_output) {
								print "<div class='text-error'>Error: " . $e->getMessage() . "</div>";
							} else {
								Debug::log("Error: " . $e->getMessage());
							}

							$this->pdo->rollBack();
							return false;
						}
					}
				}

				$db_version = self::get_schema_version();

				if ($db_version == $version) {
					$this->pdo->commit();
					return true;
				} else {
					$this->pdo->rollBack();
					return false;
				}
			} else {
				return false;
			}
		} else {
			return false;
		}
	}

}
