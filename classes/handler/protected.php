<?php
class Handler_Protected extends Handler {

	function before(string $method): bool {
		return parent::before($method) && !empty($_SESSION['uid']);
	}
}
