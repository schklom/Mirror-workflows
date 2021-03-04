<?php
class Db_Migrations {

	private $base_filename = "schema.sql";
	private $base_path;
	private $migrations_path;
	private $migrations_table;
	private $base_is_latest;
	private $pdo;

	private $cached_version;
	private $cached_max_version;

	function __construct() {
		$this->pdo = Db::pdo();
	}

	function initialize_for_plugin(Plugin $plugin, bool $base_is_latest = true, string $schema_suffix = "sql") {
		$plugin_dir = PluginHost::getInstance()->get_plugin_dir($plugin);
		$this->initialize($plugin_dir . "/${schema_suffix}",
			strtolower("ttrss_migrations_plugin_" . get_class($plugin)),
			$base_is_latest);
	}

	function initialize(string $root_path, string $migrations_table, bool $base_is_latest = true) {
		$this->base_path = "$root_path/" . Config::get(Config::DB_TYPE);
		$this->migrations_path = $this->base_path . "/migrations";
		$this->migrations_table = $migrations_table;
		$this->base_is_latest = $base_is_latest;
	}

	private function set_version(int $version) {
		$sth = $this->pdo->query("SELECT * FROM {$this->migrations_table}");

		if ($res = $sth->fetch()) {
			$sth = $this->pdo->prepare("UPDATE {$this->migrations_table} SET schema_version = ?");
		} else {
			$sth = $this->pdo->prepare("INSERT INTO {$this->migrations_table} (schema_version) VALUES (?)");
		}

		$sth->execute([$version]);

		$this->cached_version = $version;
	}

	private function get_version() : int {
		if (isset($this->cached_version))
			return $this->cached_version;

		try {
			$sth = $this->pdo->query("SELECT * FROM {$this->migrations_table}");

			if ($res = $sth->fetch()) {
				return (int) $res['schema_version'];
			} else {
				return -1;
			}
		} catch (PDOException $e) {
			$this->create_migrations_table();

			return -1;
		}
	}

	private function create_migrations_table() {
		$this->pdo->query("CREATE TABLE IF NOT EXISTS {$this->migrations_table} (schema_version integer not null)");
	}

	private function migrate_to(int $version) {
		try {
			$this->pdo->beginTransaction();

			foreach ($this->get_lines($version) as $line) {
				$this->pdo->query($line);
			}

			if ($version == 0 && $this->base_is_latest)
				$this->set_version($this->get_max_version());
			else
				$this->set_version($version);

			$this->pdo->commit();
		} catch (PDOException $e) {
			try {
				$this->pdo->rollback();
			} catch (PDOException $ie) {
				//
			}
			throw $e;
		}
	}

	private function get_max_version() : int {
		if (isset($this->cached_max_version))
			return $this->cached_max_version;

		$migrations = glob("{$this->migrations_path}/*.sql");

		if (count($migrations) > 0) {
			natsort($migrations);

			$this->cached_max_version = (int) basename(array_pop($migrations), ".sql");

		} else {
			$this->cached_max_version = 0;
		}

		return $this->cached_max_version;
	}

	function migrate() : bool {

		for ($i = $this->get_version() + 1; $i <= $this->get_max_version(); $i++)
			try {
				$this->migrate_to($i);
			} catch (PDOException $e) {
				user_error("Failed applying migration $i on table {$this->migrations_table}: " . $e->getMessage(), E_USER_WARNING);
				//throw $e;
			}

		return $this->get_version() == $this->get_max_version();
	}

	private function get_lines(int $version) : array {
		if ($version > 0)
			$filename = "{$this->migrations_path}/${version}.sql";
		else
			$filename = "{$this->base_path}/{$this->base_filename}";

		if (file_exists($filename)) {
			$lines =	array_filter(preg_split("/[\r\n]/", file_get_contents($filename)),
							function ($line) {
								return strlen(trim($line)) > 0 && strpos($line, "--") !== 0;
							});

			return array_filter(explode(";", implode("", $lines)), function ($line) {
				return strlen(trim($line)) > 0;
			});

		} else {
			user_error(E_USER_ERROR, "[migrations] requested schema file ${filename} not found.");
			return [];
		}
	}
}
