<?php
class Config {

   const DB_TYPE = "DB_TYPE";
   const DB_HOST = "DB_HOST";
   const DB_USER = "DB_USER";
   const DB_NAME = "DB_NAME";
   const DB_PASS = "DB_PASS";
   const DB_PORT = "DB_PORT";
   const MYSQL_CHARSET = "MYSQL_CHARSET";
   const SELF_URL_PATH = "SELF_URL_PATH";
   const SINGLE_USER_MODE = "SINGLE_USER_MODE";
   const SIMPLE_UPDATE_MODE = "SIMPLE_UPDATE_MODE";
   const PHP_EXECUTABLE = "PHP_EXECUTABLE";
   const LOCK_DIRECTORY = "LOCK_DIRECTORY";
   const CACHE_DIR = "CACHE_DIR";
   const ICONS_DIR = "ICONS_DIR";
   const ICONS_URL = "ICONS_URL";
   const AUTH_AUTO_CREATE = "AUTH_AUTO_CREATE";
   const AUTH_AUTO_LOGIN = "AUTH_AUTO_LOGIN";
   const FORCE_ARTICLE_PURGE = "FORCE_ARTICLE_PURGE";
   const ENABLE_REGISTRATION = "ENABLE_REGISTRATION";
   const SESSION_COOKIE_LIFETIME = "SESSION_COOKIE_LIFETIME";
   const SMTP_FROM_NAME = "SMTP_FROM_NAME";
   const SMTP_FROM_ADDRESS = "SMTP_FROM_ADDRESS";
   const DIGEST_SUBJECT = "DIGEST_SUBJECT";
   const CHECK_FOR_UPDATES = "CHECK_FOR_UPDATES";
   const PLUGINS = "PLUGINS";
   const LOG_DESTINATION = "LOG_DESTINATION";

   private const _DEFAULTS = [
      Config::DB_TYPE => "pgsql",
      Config::DB_HOST => "db",
      Config::DB_USER => "",
      Config::DB_NAME => "",
      Config::DB_PASS => "",
      Config::DB_PORT => "5432",
      Config::MYSQL_CHARSET => "UTF8",
      Config::SELF_URL_PATH => "",
      Config::SINGLE_USER_MODE => "",
      Config::SIMPLE_UPDATE_MODE => "",
      Config::PHP_EXECUTABLE => "/usr/bin/php",
      Config::LOCK_DIRECTORY => "lock",
      Config::CACHE_DIR => "cache",
      Config::ICONS_DIR => "feed-icons",
      Config::ICONS_URL => "feed-icons",
      Config::AUTH_AUTO_CREATE => "true",
      Config::AUTH_AUTO_LOGIN => "true",
      Config::FORCE_ARTICLE_PURGE => 0,
      Config::ENABLE_REGISTRATION => "",
      Config::SESSION_COOKIE_LIFETIME => 86400,
      Config::SMTP_FROM_NAME => "Tiny Tiny RSS",
      Config::SMTP_FROM_ADDRESS => "noreply@localhost",
      Config::DIGEST_SUBJECT => "[tt-rss] New headlines for last 24 hours",
      Config::CHECK_FOR_UPDATES => "true",
      Config::PLUGINS => "auth_internal",
      Config::LOG_DESTINATION => "sql",
   ];

   private const _ENVVAR_PREFIX = "TTRSS_";
   private static $instance;

   private $params = [];

   public static function get_instance() {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

   function __construct() {
      $ref = new ReflectionClass(get_class($this));

      foreach ($ref->getConstants() as $const => $cvalue) {
         if (strpos($const, "_") !== 0) {
            $override = getenv($this::_ENVVAR_PREFIX . $const);

            if (!empty($override)) {
               $this->params[$cvalue] = $override;
            } else {
               $this->params[$cvalue] = $this::_DEFAULTS[$const];
            }
         }
      }
   }

   private function _get($param) {
      return $this->params[$param];
   }

   static function get($param) {
      $instance = self::get_instance();

      return $instance->_get($param);
   }

}