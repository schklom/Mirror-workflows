#!/bin/sh

docker run --rm -v $(pwd):/app \
	--workdir /app registry.fakecake.org/infra/php-fpm8.3-alpine3.19:latest \
	php83 -d memory_limit=-1 ./vendor/bin/phpunit --exclude integration
