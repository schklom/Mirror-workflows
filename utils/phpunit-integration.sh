#!/bin/sh

export PHP_IMAGE=registry.fakecake.org/infra/php8.3-alpine3.20

docker run --rm -v $(pwd):/app -e API_URL=${API_URL} \
	--workdir /app ${PHP_IMAGE} \
	php83 -d memory_limit=-1 ./vendor/bin/phpunit --group integration
