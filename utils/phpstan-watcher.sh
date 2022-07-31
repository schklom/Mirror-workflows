#!/bin/sh

PHP_VERSION="$1"

[ -z "$PHP_VERSION" ] && PHP_VERSION=8.1

echo PHP_VERSION: ${PHP_VERSION}
echo PWD: $(pwd)

while true; do
	inotifywait . -e close_write -r -t 300 | grep -q .php && \
		(
			docker run --rm -v $(pwd):/app -v /tmp/phpstan-8.1:/tmp/phpstan \
				--workdir /app php:${PHP_VERSION}-cli php -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G --error-format=raw
			echo All done, RC=$?.
		)
	sleep 1
done
