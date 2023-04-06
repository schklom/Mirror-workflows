#!/bin/sh

PHP_VERSION="$1"

[ -z "$PHP_VERSION" ] && PHP_VERSION=8.1

echo PHP_VERSION: ${PHP_VERSION}
echo PWD: $(pwd)

while true; do
	inotifywait . -e close_write -r -t 300 | grep -q .php && \
		(
			MODIFIED=$(git ls-files -m | grep .php)

			docker run --rm -v $(pwd):/app -v /tmp/phpstan-8.1:/tmp/phpstan \
				--workdir /app registry.fakecake.org/cthulhoo/ci-alpine:3.16 php81 -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G --error-format=raw analyze ${MODIFIED}
			echo All done, RC=$?.
		)
	sleep 1
done
