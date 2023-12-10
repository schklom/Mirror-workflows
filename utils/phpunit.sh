#!/bin/sh

docker run --rm -v $(pwd):/app \
	--workdir /app registry.fakecake.org/infra/php8.3-alpine:3.19 \
	php83 -d memory_limit=-1 ./vendor/bin/phpunit --exclude integration
