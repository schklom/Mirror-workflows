#!/bin/sh

docker run --rm -v $(pwd):/app \
	--workdir /app registry.fakecake.org/ci/php8.2-alpine:3.18 php82 -d memory_limit=-1 ./vendor/bin/phpunit


