<?php
class Db
{
	/** @var Db $instance */
	private static $instance;

	private $link;

	/** @var PDO $pdo */
	private $pdo;

	function __construct() {
		ORM::configure(self::get_dsn());
		ORM::configure('username', Config::get(Config::DB_USER));
		ORM::configure('password', Config::get(Config::DB_PASS));
		ORM::configure('return_result_sets', true);
	}

	static function NOW() {
		return date("Y-m-d H:i:s", time());
	}

	private function __clone() {
		//
	}

	public static function get_dsn() {
		$db_port = Config::get(Config::DB_PORT) ? ';port=' . Config::get(Config::DB_PORT) : '';
		$db_host = Config::get(Config::DB_HOST) ? ';host=' . Config::get(Config::DB_HOST) : '';

		return Config::get(Config::DB_TYPE) . ':dbname=' . Config::get(Config::DB_NAME) . $db_host . $db_port;
	}

	// this really shouldn't be used unless a separate PDO connection is needed
	// normal usage is Db::pdo()->prepare(...) etc
	public function pdo_connect() : PDO {

		try {
			$pdo = new PDO(self::get_dsn(),
				Config::get(Config::DB_USER),
				Config::get(Config::DB_PASS));
		} catch (Exception $e) {
			print "<pre>Exception while creating PDO object:" . $e->getMessage() . "</pre>";
			exit(101);
		}

		$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

		if (Config::get(Config::DB_TYPE) == "pgsql") {

			$pdo->query("set client_encoding = 'UTF-8'");
			$pdo->query("set datestyle = 'ISO, european'");
			$pdo->query("set TIME ZONE 0");
			$pdo->query("set cpu_tuple_cost = 0.5");

		} else if (Config::get(Config::DB_TYPE) == "mysql") {
			$pdo->query("SET time_zone = '+0:0'");

			if (Config::get(Config::MYSQL_CHARSET)) {
				$pdo->query("SET NAMES " . Config::get(Config::MYSQL_CHARSET));
			}
		}

		return $pdo;
	}

	public static function instance() : Db {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

	public static function pdo() : PDO {
		if (self::$instance == null)
			self::$instance = new self();

		if (empty(self::$instance->pdo)) {
			self::$instance->pdo = self::$instance->pdo_connect();
		}

		return self::$instance->pdo;
	}

	public static function sql_random_function() {
		if (Config::get(Config::DB_TYPE) == "mysql") {
			return "RAND()";
		} else {
			return "RANDOM()";
		}
	}

}
