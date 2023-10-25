<?php

use OpenTelemetry\API\Trace\Propagation\TraceContextPropagator;
use OpenTelemetry\API\Trace\SpanContextInterface;
use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\API\Trace\TraceFlags;
use OpenTelemetry\API\Trace\TraceStateInterface;
use OpenTelemetry\Context\ContextInterface;
use OpenTelemetry\Context\ContextKey;
use OpenTelemetry\Context\ContextKeyInterface;
use OpenTelemetry\Context\ImplicitContextKeyedInterface;
use OpenTelemetry\Context\ScopeInterface;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Trace\Sampler\AlwaysOnSampler;
use OpenTelemetry\SDK\Trace\Sampler\ParentBased;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SemConv\ResourceAttributes;

class DummyContextInterface implements ContextInterface {

	/** @var DummyContextInterface */
	private static $instance;

	public function __construct() {
		self::$instance = $this;
	}

	/** @phpstan-ignore-next-line */
	public static function createKey(string $key): ContextKeyInterface { return new ContextKey(); }

	public static function getCurrent(): ContextInterface { return self::$instance; }

	public function activate(): ScopeInterface { return new DummyScopeInterface(); }

	public function with(ContextKeyInterface $key, $value): ContextInterface { return $this; }

	public function withContextValue(ImplicitContextKeyedInterface $value): ContextInterface { return $this; }

	public function get(ContextKeyInterface $key) { return new ContextKey(); }

}

class DummySpanContextInterface implements SpanContextInterface {

	/** @var DummySpanContextInterface $instance */
	private static $instance;

	public function __construct() {
		self::$instance = $this;
	}

	public static function createFromRemoteParent(string $traceId, string $spanId, int $traceFlags = TraceFlags::DEFAULT, ?TraceStateInterface $traceState = null): SpanContextInterface { return self::$instance; }

	public static function getInvalid(): SpanContextInterface { return self::$instance; }

	public static function create(string $traceId, string $spanId, int $traceFlags = TraceFlags::DEFAULT, ?TraceStateInterface $traceState = null): SpanContextInterface { return self::$instance; }

	public function getTraceId(): string { return ""; }

	public function getTraceIdBinary(): string { return ""; }

	public function getSpanId(): string { return ""; }

	public function getSpanIdBinary(): string { return ""; }

	public function getTraceFlags(): int { return 0; }

	public function getTraceState(): ?TraceStateInterface { return null; }

	public function isValid(): bool { return false; }

	public function isRemote(): bool { return false; }

	public function isSampled(): bool { return false; }
}

class DummyScopeInterface implements ScopeInterface {
	public function detach(): int { return 0; }
}

class DummySpanInterface implements SpanInterface {

	/** @var DummySpanInterface $instance */
	private static $instance;

	public function __construct() {
		self::$instance = $this;
	}

	public static function fromContext(ContextInterface $context): SpanInterface { return self::$instance; }

	public static function getCurrent(): SpanInterface { return self::$instance; }

	public static function getInvalid(): SpanInterface { return self::$instance; }

	public static function wrap(SpanContextInterface $spanContext): SpanInterface { return self::$instance; }

	public function getContext(): SpanContextInterface { return new DummySpanContextInterface(); }

	public function isRecording(): bool { return false; }

	/** @phpstan-ignore-next-line */
	public function setAttribute(string $key, $value): SpanInterface { return self::$instance; }

	/** @phpstan-ignore-next-line */
	public function setAttributes(iterable $attributes): SpanInterface { return self::$instance; }

	/** @phpstan-ignore-next-line */
	public function addEvent(string $name, iterable $attributes = [], ?int $timestamp = null): SpanInterface { return $this; }

	/** @phpstan-ignore-next-line */
	public function recordException(Throwable $exception, iterable $attributes = []): SpanInterface { return $this; }

	public function updateName(string $name): SpanInterface { return $this; }

	public function setStatus(string $code, ?string $description = null): SpanInterface { return $this; }

	public function end(?int $endEpochNanos = null): void { }

	public function activate(): ScopeInterface { return new DummyScopeInterface(); }

	public function storeInContext(ContextInterface $context): ContextInterface { return new DummyContextInterface(); }

}

class Tracer {
	/** @var Tracer $instance */
	private static $instance = null;

	/** @var OpenTelemetry\SDK\Trace\TracerProviderInterface $tracerProvider */
	private $tracerProvider = null;

	/** @var OpenTelemetry\API\Trace\TracerInterface $tracer */
	private $tracer = null;

	public function __construct() {
		$OPENTELEMETRY_ENDPOINT = Config::get(Config::OPENTELEMETRY_ENDPOINT);

		if ($OPENTELEMETRY_ENDPOINT) {
			$transport = (new OtlpHttpTransportFactory())->create($OPENTELEMETRY_ENDPOINT, 'application/x-protobuf');
			$exporter = new SpanExporter($transport);

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

			$span = $this->tracer->spanBuilder($_SESSION['name'] ?? 'not logged in')
				->setParent($context)
				->setSpanKind(SpanKind::KIND_SERVER)
				->setAttribute('php.request', json_encode($_REQUEST))
				->setAttribute('php.server', json_encode($_SERVER))
				->setAttribute('php.session', json_encode($_SESSION ?? []))
				->startSpan();

			$scope = $span->activate();

			register_shutdown_function(function() use ($span, $scope) {
				$span->end();
				$scope->detach();
				$this->tracerProvider->shutdown();
			});
		}
	}

	/**
	 * @param string $name
	 * @return OpenTelemetry\API\Trace\SpanInterface
	 */
	private function _start(string $name) {
		if ($this->tracer != null) {
			$span = $this->tracer
				->spanBuilder($name)
				->setSpanKind(SpanKind::KIND_SERVER)
				->startSpan();

			$span->activate();
		} else {
			$span = new DummySpanInterface();
		}

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
