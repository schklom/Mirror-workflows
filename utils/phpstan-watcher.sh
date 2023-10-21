#!/bin/sh

docker run --rm -v $(pwd):/app -v /tmp/phpstan-8.1:/tmp/phpstan \
	--workdir /app registry.fakecake.org/ci/php8.2-alpine:3.18 php82 -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G --error-format=raw analyze .
echo All done, RC=$?.

while true; do
	inotifywait . -e close_write -r -t 300 | grep -q .php && \
		(
			MODIFIED=$(git ls-files -m | grep .php)

			docker run --rm -v $(pwd):/app -v /tmp/phpstan-8.1:/tmp/phpstan \
				--workdir /app registry.fakecake.org/ci/php8.2-alpine:3.18 php82 -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G --error-format=raw analyze ${MODIFIED}
			echo All done, RC=$?.
		)
	sleep 1
done
