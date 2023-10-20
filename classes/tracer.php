<?php

use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\API\Trace\Propagation\TraceContextPropagator;
use OpenTelemetry\API\Trace\Span;
use OpenTelemetry\SDK\Trace\SpanExporter\InMemoryExporter;

use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SemConv\ResourceAttributes;

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

		$resource = ResourceInfoFactory::emptyResource()->merge(
			ResourceInfo::create(Attributes::create(
				[ResourceAttributes::SERVICE_NAME => Config::get(Config::OPENTELEMETRY_SERVICE)]
			), ResourceAttributes::SCHEMA_URL),
		);

		$tracerProvider =  new TracerProvider(new SimpleSpanProcessor($exporter), null, $resource);

		$this->tracer = $tracerProvider->getTracer('io.opentelemetry.contrib.php');

		$context = TraceContextPropagator::getInstance()->extract(getallheaders());
		$span = $this->tracer->spanBuilder('root')
			->setParent($context)
			->setAttribute('http.request', json_encode($_REQUEST))
			->startSpan();

		$scope = $span->activate();

		register_shutdown_function(function() use ($span, $tracerProvider, $scope) {
			$span->end();
			$scope->detach();

			$tracerProvider->shutdown();
		});
	}

	/**
	 * @param string $name
	 * @return OpenTelemetry\API\Trace\SpanInterface
	 */
	private function _start(string $name) {
		$span = $this->tracer->spanBuilder($name)->startSpan();

		$span->activate();

		return $span;
	}

	/**
	 * @param string $name
	 * @return OpenTelemetry\API\Trace\SpanInterface
	 */
	public static function start(string $name) {
		return self::get_instance()->_start($name);
	}

	public static function get_instance() : Tracer {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}
}
