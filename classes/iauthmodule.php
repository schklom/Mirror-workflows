<?php
interface IAuthModule {
	/**
	 * @param string $login
	 * @param string $password
	 * optional third string $service
	 * @return int|false user_id
	 */
	function authenticate($login, $password); // + optional third parameter: $service

	/** this is a pluginhost compatibility wrapper that invokes $this->authenticate(...$args) (Auth_Base)
	 * @param mixed $args = ($login, $password, $service)
	 * @return int|false user_id
	 */
	function hook_auth_user(...$args);
}
