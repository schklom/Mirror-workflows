<?php
class Handler implements IHandler {
	protected PDO $pdo;

	/** @var array<int|string, mixed> */
	protected array $args;

	/**
	 * @param array<int|string, mixed> $args
	 */
	function __construct(array $args) {
		$this->pdo = Db::pdo();
		$this->args = $args;
	}

	function csrf_ignore(string $method): bool {
		return false;
	}

	function before(string $method): bool {
		return true;
	}

	function after(): bool {
		return true;
	}

	/**
	 * @param mixed $p
	 */
	protected static function _param_to_bool($p): bool {
		$p = clean($p);
		return $p && ($p !== "f" && $p !== "false");
	}
}
