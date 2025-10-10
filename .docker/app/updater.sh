#!/bin/sh -e

# We don't need those here (HTTP_HOST would cause false SELF_URL_PATH check failures)
unset HTTP_PORT
unset HTTP_HOST

unset ADMIN_USER_PASS
unset AUTO_CREATE_USER_PASS

# allow setting environment variables with docker secrets 
# the format is <variable-name>__FILE
SUFFIX="__FILE"

# loop through all environment variables
for VAR in $(printenv | awk -F= '{print $1}'); do
	if [[ $VAR == *"$SUFFIX" ]]; then
		ENV_FILE_NAME="$(printenv "${VAR}")"
		ENV_VAR="${VAR%$SUFFIX}"

		if printenv "$ENV_VAR" &>/dev/null; then
			echo "warning: Both $ENV_VAR and $VAR are set. $VAR will override $ENV_VAR."
		fi

		if [[ -r "$ENV_FILE_NAME" ]]; then
			VALUE="$(cat "$ENV_FILE_NAME")"
			export "$ENV_VAR"="$VALUE"
			echo "$ENV_VAR environment variable was set by secret file $ENV_FILE_NAME"
		else
			echo "warning: Secret file $ENV_FILE_NAME for $VAR is not readable or does not exist."
		fi
	fi
done

# wait for the app container to delete .app_is_ready and perform rsync, etc.
sleep 30

if ! id app; then
	addgroup -g $OWNER_GID app
	adduser -D -h /var/www/html -G app -u $OWNER_UID app
fi

while ! pg_isready -h $TTRSS_DB_HOST -U $TTRSS_DB_USER -p $TTRSS_DB_PORT; do
	echo waiting until $TTRSS_DB_HOST is ready...
	sleep 3
done

sed -i.bak "s/^\(memory_limit\) = \(.*\)/\1 = ${PHP_WORKER_MEMORY_LIMIT}/" \
	/etc/php${PHP_SUFFIX}/php.ini

DST_DIR=/var/www/html/tt-rss

while [ ! -s $DST_DIR/config.php -a -e $DST_DIR/.app_is_ready ]; do
	echo waiting for app container...
	sleep 3
done

sudo -E -u app "${TTRSS_PHP_EXECUTABLE}" /var/www/html/tt-rss/update_daemon2.php "$@"
