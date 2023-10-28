<?php
use PHPUnit\Framework\TestCase;

/** @group integration */
final class ApiTest extends TestCase {

	/** @var string */
	private $api_url;

	/** @var string */
	private $sid;

	function __construct() {

		$this->api_url = $_ENV['API_URL'];

		print_r($this->api_url);

		parent::__construct();
	}

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

	public function common_assertions(array $response) {
		$this->assertArrayHasKey("content", $response);
		$this->assertArrayNotHasKey("error", $response['content'], $response['content']['error']);
	}

	public function test_login() {
		$response = $this->api(["op" => "login", "user" => "test", "password" => "test"]);

		$this->common_assertions($response);
	}

	public function test_getVersion() {

		$response = $this->api(["op" => "getVersion"]);

		$this->common_assertions($response);


	}

}
