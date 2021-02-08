<?php
interface IAuthModule {
	function authenticate($login, $password); // + optional third parameter: $service
	function hook_auth_user(...$args); // compatibility wrapper due to how hooks work
}
