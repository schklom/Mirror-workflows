<?php
interface IHandler {
	function csrf_ignore(string $method): bool;
	function before($method);
	function after();
}
