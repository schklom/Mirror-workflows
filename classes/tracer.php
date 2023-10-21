<?php


use OpenTelemetry\API\Trace\Propagation\TraceContextPropagator;
use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Trace\Sampler\AlwaysOnSampler;
use OpenTelemetry\SDK\Trace\Sampler\ParentBased;
use OpenTelemetry\SDK\Trace\SpanExporter\InMemoryExporter;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SemConv\ResourceAttributes;

class Tracer {
	/** @var Tracer $instance */
	private static $instance;

	/** @var OpenTelemetry\SDK\Trace\TracerProviderInterface $tracerProvider */
	private $tracerProvider;

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

		$this->tracerProvider = TracerProvider::builder()
			->addSpanProcessor(new SimpleSpanProcessor($exporter))
			->setResource($resource)
			->setSampler(new ParentBased(new AlwaysOnSampler()))
			->build();

		$this->tracer = $this->tracerProvider->getTracer('io.opentelemetry.contrib.php');

		$context = TraceContextPropagator::getInstance()->extract(getallheaders());

		$span = $this->tracer->spanBuilder($_SESSION['name'] ?? 'not-logged-in')
			->setParent($context)
			->setSpanKind(SpanKind::KIND_SERVER)
			->setAttribute('php.request', json_encode($_REQUEST ?? []))
			->setAttribute('php.server', json_encode($_SERVER ?? []))
			->setAttribute('php.session', json_encode($_SESSION ?? []))
			->startSpan();

		$scope = $span->activate();

		register_shutdown_function(function() use ($span, $scope) {
			$span->end();
			$scope->detach();
			$this->tracerProvider->shutdown();
		});
	}

	/**
	 * @param string $name
	 * @return OpenTelemetry\API\Trace\SpanInterface
	 */
	private function _start(string $name) {
		$span = $this->tracer
			->spanBuilder($name)
			->setSpanKind(SpanKind::KIND_SERVER)
			->startSpan();

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
