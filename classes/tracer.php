<?php

use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\API\Trace\Propagation\TraceContextPropagator;
use OpenTelemetry\API\Trace\Span;
use OpenTelemetry\SDK\Trace\SpanExporter\InMemoryExporter;

class Tracer {
	/** @var Tracer $instance */
	private static $instance;

	/** @var OpenTelemetry\API\Trace\TracerInterface $tracer */
	private $tracer;

	public function __construct() {
		$OPENTELEMETRY_ENDPOINT = Config::get(Config::OPENTELEMETRY_ENDPOINT);

		if ($OPENTELEMETRY_ENDPOINT) {
			$transport = (new OtlpHttpTransportFactory())->create($OPENTELEMETRY_ENDPOINT, 'application/x-protobuf');
			$exporter = new SpanExporter($transport);
		} else {
			$exporter = new InMemoryExporter();
		}

		$tracerProvider =  new TracerProvider(new SimpleSpanProcessor($exporter));
		$this->tracer = $tracerProvider->getTracer('io.opentelemetry.contrib.php');

		$context = TraceContextPropagator::getInstance()->extract(getallheaders());
		$span = $this->tracer->spanBuilder(Config::get(Config::OPENTELEMETRY_SERVICE))
			->setParent($context)
			->startSpan();

		$span->activate();

		register_shutdown_function(function() use ($span, $tracerProvider) {
			$span->end();

			$tracerProvider->shutdown();
		});
	}

	/**
	 * @param string $name
	 * @param array<string>|array<string, array<string, mixed>> $tags
	 * @param array<string> $args
	 * @return OpenTelemetry\API\Trace\SpanInterface
	 */
	private function _start(string $name, array $tags = [], array $args = []) {
		$span = $this->tracer->spanBuilder($name)->startSpan();

		foreach ($tags as $k => $v) {
			$span->setAttribute($k, $v);
		}

		$span->setAttribute("func.args", json_encode($args));

		$span->activate();

		return $span;
	}

	/**
	 * @param string $name
	 * @param array<string>|array<string, array<string, mixed>> $tags
	 * @param array<string> $args
	 * @return OpenTelemetry\API\Trace\SpanInterface
	 */
	public static function start(string $name, array $tags = [], array $args = []) {
		return self::get_instance()->_start($name, $tags, $args);
	}

	public static function get_instance() : Tracer {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}
}
