<?php
use OpenTracing\GlobalTracer;
use OpenTracing\Scope;

class Tracer {
	/** @var Tracer $instance */
	private static $instance;

	public function __construct() {
		$jaeger_host = Config::get(Config::JAEGER_REPORTING_HOST);

		if ($jaeger_host) {
			$config = new \Jaeger\Config(
				[
					'sampler' => [
						'type' => \Jaeger\SAMPLER_TYPE_CONST,
						'param' => true,
					],
					'logging' => true,
					"local_agent" => [
						"reporting_host" => $jaeger_host,
						"reporting_port" => 6832
					],
					'dispatch_mode' => \Jaeger\Config::JAEGER_OVER_BINARY_UDP,
				],
				Config::get(Config::JAEGER_SERVICE_NAME)
			);

			$config->initializeTracer();

			register_shutdown_function(function() {
				$tracer = GlobalTracer::get();
				$tracer->flush();
			});
		}
	}

	/**
	 * @param string $name
	 * @param array<string>|array<string, array<string, mixed>> $tags
	 * @param array<string> $args
	 * @return Scope
	 */
	private function _start(string $name, array $tags = [], array $args = []): Scope {
		$tracer = GlobalTracer::get();

		$tags['args'] = json_encode($args);

		return $tracer->startActiveSpan($name, ['tags' => $tags]);
	}

	/**
	 * @param string $name
	 * @param array<string>|array<string, array<string, mixed>> $tags
	 * @param array<string> $args
	 * @return Scope
	 */
	public static function start(string $name, array $tags = [], array $args = []) : Scope {
		return self::get_instance()->_start($name, $tags, $args);
	}

	public static function get_instance() : Tracer {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

}
