#!/bin/sh -e
#
# this script initializes the working copy on a persistent volume and starts PHP FPM
#

# TODO this should do a reasonable amount of attempts and terminate with an error
while ! pg_isready -h $TTRSS_DB_HOST -U $TTRSS_DB_USER -p $TTRSS_DB_PORT; do
	echo waiting until $TTRSS_DB_HOST is ready...
	sleep 3
done

# We don't need those here (HTTP_HOST would cause false SELF_URL_PATH check failures)
unset HTTP_PORT
unset HTTP_HOST

if ! id app >/dev/null 2>&1; then
	addgroup -g $OWNER_GID app
	adduser -D -h $APP_INSTALL_BASE_DIR -G app -u $OWNER_UID app
fi

update-ca-certificates || true

DST_DIR=$APP_INSTALL_BASE_DIR/tt-rss

[ -e $DST_DIR ] && rm -f $DST_DIR/.app_is_ready

export PGPASSWORD=$TTRSS_DB_PASS

[ ! -e $APP_INSTALL_BASE_DIR/index.php ] && cp ${SCRIPT_ROOT}/index.php $APP_INSTALL_BASE_DIR

if [ -z $SKIP_RSYNC_ON_STARTUP ]; then
	if [ ! -d $DST_DIR ]; then
		mkdir -p $DST_DIR
		chown $OWNER_UID:$OWNER_GID $DST_DIR

		sudo -u app rsync -a --no-owner \
			$SRC_DIR/ $DST_DIR/
	else
		chown -R $OWNER_UID:$OWNER_GID $DST_DIR

		sudo -u app rsync -a --no-owner --delete \
			--exclude /cache \
			--exclude /lock \
			--exclude /feed-icons \
			--exclude /plugins/af_comics/filters.local \
			--exclude /plugins.local \
			--exclude /templates.local \
			--exclude /themes.local \
			$SRC_DIR/ $DST_DIR/

		sudo -u app rsync -a --no-owner --delete \
			$SRC_DIR/plugins.local/nginx_xaccel \
			$DST_DIR/plugins.local/nginx_xaccel
	fi
else
	echo "warning: working copy in $DST_DIR won't be updated, make sure you know what you're doing."
fi

for d in cache lock feed-icons plugins.local themes.local templates.local cache/export cache/feeds cache/images cache/upload; do
	sudo -u app mkdir -p $DST_DIR/$d
done

# this is some next level bullshit
# - https://stackoverflow.com/questions/65622914/why-would-i-get-a-php-pdoexception-complaining-that-it-cant-make-a-postgres-con
# - fatal error: could not open certificate file "/root/.postgresql/postgresql.crt": Permission denied
chown -R app:app /root # /.postgresql

# TODO chown -R app:app should be enough (?)
for d in cache lock feed-icons; do
	chmod 777 $DST_DIR/$d
	find $DST_DIR/$d -type f -exec chmod 666 {} \;
done

sudo -u app cp ${SCRIPT_ROOT}/config.docker.php $DST_DIR/config.php
chmod 644 $DST_DIR/config.php

chown -R $OWNER_UID:$OWNER_GID $DST_DIR \
	/var/log/php${PHP_SUFFIX}

if [ -z "$TTRSS_NO_STARTUP_PLUGIN_UPDATES" ]; then
	echo updating all local plugins...

	find $DST_DIR/plugins.local -mindepth 1 -maxdepth 1 -type d | while read PLUGIN; do
		if [ -d $PLUGIN/.git ]; then
			echo updating $PLUGIN...

			cd $PLUGIN && \
				sudo -u app git config core.filemode false && \
				sudo -u app git config pull.rebase false && \
				sudo -u app git pull origin master || echo warning: attempt to update plugin $PLUGIN failed.
		fi
	done
else
	echo skipping local plugin updates, disabled.
fi

PSQL="psql -q -h $TTRSS_DB_HOST -p $TTRSS_DB_PORT -U $TTRSS_DB_USER $TTRSS_DB_NAME"

$PSQL -c "create extension if not exists pg_trgm"

# this was previously generated
rm -f $DST_DIR/config.php.bak

if [ ! -z "${TTRSS_XDEBUG_ENABLED}" ]; then
	if [ -z "${TTRSS_XDEBUG_HOST}" ]; then
		export TTRSS_XDEBUG_HOST=$(ip ro sh 0/0 | cut -d " " -f 3)
	fi
	echo enabling xdebug with the following parameters:
	env | grep TTRSS_XDEBUG
	cat > /etc/php${PHP_SUFFIX}/conf.d/50_xdebug.ini <<EOF
zend_extension=xdebug.so
xdebug.mode=debug
xdebug.start_with_request = yes
xdebug.client_port = ${TTRSS_XDEBUG_PORT}
xdebug.client_host = ${TTRSS_XDEBUG_HOST}
EOF
fi

sed -i.bak "s/^\(memory_limit\) = \(.*\)/\1 = ${PHP_WORKER_MEMORY_LIMIT}/" \
	/etc/php${PHP_SUFFIX}/php.ini

sed -i.bak "s/^\(pm.max_children\) = \(.*\)/\1 = ${PHP_WORKER_MAX_CHILDREN}/" \
	/etc/php${PHP_SUFFIX}/php-fpm.d/www.conf

sudo -Eu app php${PHP_SUFFIX} $DST_DIR/update.php --update-schema=force-yes

if [ ! -z "$ADMIN_USER_PASS" ]; then
	sudo -Eu app php${PHP_SUFFIX} $DST_DIR/update.php --user-set-password "admin:$ADMIN_USER_PASS"
else
	if sudo -Eu app php${PHP_SUFFIX} $DST_DIR/update.php --user-check-password "admin:password"; then
		RANDOM_PASS=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16 ; echo '')

		echo "*****************************************************************************"
		echo "* Setting initial built-in admin user password to '$RANDOM_PASS'        *"
		echo "* If you want to set it manually, use ADMIN_USER_PASS environment variable. *"
		echo "*****************************************************************************"

		sudo -Eu app php${PHP_SUFFIX} $DST_DIR/update.php --user-set-password "admin:$RANDOM_PASS"
	fi
fi

if [ ! -z "$ADMIN_USER_ACCESS_LEVEL" ]; then
	sudo -Eu app php${PHP_SUFFIX} $DST_DIR/update.php --user-set-access-level "admin:$ADMIN_USER_ACCESS_LEVEL"
fi

if [ ! -z "$AUTO_CREATE_USER" ]; then
	sudo -Eu app /bin/sh -c "php${PHP_SUFFIX} $DST_DIR/update.php --user-exists $AUTO_CREATE_USER ||
		php${PHP_SUFFIX} $DST_DIR/update.php --force-yes --user-add \"$AUTO_CREATE_USER:$AUTO_CREATE_USER_PASS:$AUTO_CREATE_USER_ACCESS_LEVEL\""

	if [ ! -z "$AUTO_CREATE_USER_ENABLE_API" ]; then
		# TODO: remove || true later
		sudo -Eu app /bin/sh -c "php${PHP_SUFFIX} $DST_DIR/update.php --user-enable-api \"$AUTO_CREATE_USER:$AUTO_CREATE_USER_ENABLE_API\"" || true
	fi

fi

rm -f /tmp/error.log && mkfifo /tmp/error.log && chown app:app /tmp/error.log

(tail -q -f /tmp/error.log >> /proc/1/fd/2) &

unset ADMIN_USER_PASS
unset AUTO_CREATE_USER_PASS

find ${SCRIPT_ROOT}/sql/post-init.d/ -type f -name '*.sql' | while read F; do
	echo applying SQL patch file: $F
	$PSQL -f $F
done

touch $DST_DIR/.app_is_ready

exec /usr/sbin/php-fpm${PHP_SUFFIX} --nodaemonize --force-stderr
