<?php
class Errors {
	const E_SUCCESS = "E_SUCCESS";
	const E_UNAUTHORIZED = "E_UNAUTHORIZED";
	const E_UNKNOWN_METHOD = "E_UNKNOWN_METHOD";
	const E_UNKNOWN_PLUGIN = "E_UNKNOWN_PLUGIN";
	const E_SCHEMA_MISMATCH = "E_SCHEMA_MISMATCH";
	const E_URL_SCHEME_MISMATCH = "E_URL_SCHEME_MISMATCH";

	/**
	 * @param Errors::E_* $code
	 * @param array<string, string> $params
	 */
	static function to_json(string $code, array $params = []): string {
		return json_encode(["error" => ["code" => $code, "params" => $params]]);
	}
}
