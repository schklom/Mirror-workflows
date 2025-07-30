#!/bin/sh

export PHP_IMAGE=registry.fakecake.org/infra/php8.4-alpine3.22

docker run --rm -v $(pwd):/app -v /tmp/phpstan:/tmp/phpstan \
	--workdir /app ${PHP_IMAGE} \
	php84 -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G --error-format=raw analyze .

echo All done, RC=$?.

while true; do
	inotifywait . -e close_write -r -t 300 | grep -q .php && \
		(
			MODIFIED=$(git ls-files -m | grep .php)

			docker run --rm -v $(pwd):/app -v /tmp/phpstan:/tmp/phpstan \
				--workdir /app ${PHP_IMAGE} \
				php84 -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G --error-format=raw analyze .

			echo All done, RC=$?.
		)
	sleep 1
done
