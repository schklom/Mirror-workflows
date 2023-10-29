<?php
use PHPUnit\Framework\TestCase;

/** @group integration */
final class ApiTest extends TestCase {

	/** @var string */
	private $api_url;

	function __construct() {
		$this->api_url = getenv('API_URL');

		parent::__construct();
	}

	/** @param array<mixed> $payload
	 * @return array<mixed>
	 */
	function api(array $payload) : ?array {
		$ch = curl_init($this->api_url);

		curl_setopt($ch, CURLOPT_HEADER, false);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-type: application/json"]);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

		$response = curl_exec($ch);

		$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

		curl_close($ch);

		return json_decode($response, true);
	}

	/** @param array<mixed> $response */
	public function common_assertions(array $response) : void {
		$this->assertArrayHasKey("content", $response);
		$this->assertArrayNotHasKey("error", $response['content'], $response['content']['error']);
	}

	public function test_login() : void {
		$response = $this->api(["op" => "login", "user" => "test", "password" => "test"]);

		$this->common_assertions($response);
	}

	public function test_getVersion() : void {

		$response = $this->api(["op" => "getVersion"]);

		$this->common_assertions($response);


	}

}
