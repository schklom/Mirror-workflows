<?php
interface IHandler {
	function csrf_ignore(string $method): bool;
	function before(string $method): bool;
	function after(): bool;
}
