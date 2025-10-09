#!/bin/sh -e
#
# this scripts waits for startup.sh to finish (implying a shared volume) and runs multiprocess daemon when working copy is available
#

# We don't need those here (HTTP_HOST would cause false SELF_URL_PATH check failures)
unset HTTP_PORT
unset HTTP_HOST

unset ADMIN_USER_PASS
unset AUTO_CREATE_USER_PASS

# allow setting environment variables with docker secrets 
# the format is <variable-name>_FILE
suffix="_FILE"

# Loop through all environment variables
for var in $(printenv | awk -F= '{print $1}'); do
  if [[ $var == *"$suffix" ]]; then
		envFileName=`printenv ${var}`
		if [[ -f "$envFileName" ]]; then
			envVar="${var%$suffix}"   # generate the original env var without suffix
			val=`cat $envFileName`    # get the value of the secret from file
			export "${envVar}"="$val" # set the original env var
			echo "${envVar} environment variable was set by secret ${envFileName}"
		fi
  fi
done

# wait for the app container to delete .app_is_ready and perform rsync, etc.
sleep 30

if ! id app; then
	addgroup -g $OWNER_GID app
	adduser -D -h $APP_INSTALL_BASE_DIR -G app -u $OWNER_UID app
fi

update-ca-certificates || true

# TODO this should do a reasonable amount of attempts and terminate with an error
while ! pg_isready -h $TTRSS_DB_HOST -U $TTRSS_DB_USER -p $TTRSS_DB_PORT; do
	echo waiting until $TTRSS_DB_HOST is ready...
	sleep 3
done

sed -i.bak "s/^\(memory_limit\) = \(.*\)/\1 = ${PHP_WORKER_MEMORY_LIMIT}/" \
	/etc/php${PHP_SUFFIX}/php.ini

DST_DIR=$APP_INSTALL_BASE_DIR/tt-rss

while [ ! -s $DST_DIR/config.php -a -e $DST_DIR/.app_is_ready ]; do
	echo waiting for app container...
	sleep 3
done

# this is some next level bullshit
# - https://stackoverflow.com/questions/65622914/why-would-i-get-a-php-pdoexception-complaining-that-it-cant-make-a-postgres-con
# - fatal error: could not open certificate file "/root/.postgresql/postgresql.crt": Permission denied
chown -R app:app /root # /.postgresql

sudo -E -u app "${TTRSS_PHP_EXECUTABLE}" $APP_INSTALL_BASE_DIR/tt-rss/update_daemon2.php "$@"
