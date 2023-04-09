<?php
use OpenTracing\GlobalTracer;
use OpenTracing\Scope;

class Tracer {
	private static $instance;

	public function __construct() {
		$config = new \Jaeger\Config(
			[
				'sampler' => [
					'type' => \Jaeger\SAMPLER_TYPE_CONST,
					'param' => true,
				],
				'logging' => true,
				"local_agent" => [
					"reporting_host" => "172.17.172.39",
					"reporting_port" => 6832
				],
				'dispatch_mode' => \Jaeger\Config::JAEGER_OVER_BINARY_UDP,
			],
			'tt-rss'
		);

		$config->initializeTracer();

		register_shutdown_function(function() {
			$tracer = GlobalTracer::get();
			$tracer->flush();
		});
	}

	private function _start(string $name, array $options = []) {
		$tracer = GlobalTracer::get();
		return $tracer->startActiveSpan($name, $options);
	}

	public static function start(string $name, array $options = []) : Scope {
		return self::get_instance()->_start($name, $options);
	}

	public static function get_instance() : Tracer {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

}
