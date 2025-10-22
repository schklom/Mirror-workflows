<?php

declare(strict_types=1);

use Rector\Caching\ValueObject\Storage\FileCacheStorage;
use Rector\Config\RectorConfig;

return RectorConfig::configure()
	// TODO: use the 'composer.json' approach instead
	->withPhpSets(php82: true)
	->withCache(__DIR__ . '/.rector-tmp', FileCacheStorage::class)
	->withPaths([__DIR__])
	->withSkip([
		__DIR__ . '/lib',
		__DIR__ . '/plugins.local',
		__DIR__ . '/vendor',
		// not a fan
		Rector\Php80\Rector\Class_\ClassPropertyAssignToConstructorPromotionRector::class,
		// noisy at the moment (needs more review)
		Rector\Php81\Rector\FuncCall\NullToStrictStringFuncCallArgRector::class,
		// TODO: remove after Rector 2.2.4 bug is fixed
		Rector\CodingStyle\Rector\FunctionLike\FunctionLikeToFirstClassCallableRector::class => [__DIR__ . '/classes/Scheduler.php'],
	]);
