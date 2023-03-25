FROM registry.fakecake.org/alpine:3.17
EXPOSE 9000/tcp

ENV SCRIPT_ROOT=/opt/tt-rss
ENV SRC_DIR=/src/tt-rss/

COPY --from=app-src . ${SRC_DIR}

RUN apk add --no-cache dcron php81 php81-fpm php81-phar \
	php81-pdo php81-gd php81-pgsql php81-pdo_pgsql php81-xmlwriter \
	php81-mbstring php81-intl php81-xml php81-curl php81-simplexml \
	php81-session php81-tokenizer php81-dom php81-fileinfo php81-ctype \
	php81-json php81-iconv php81-pcntl php81-posix php81-zip php81-exif \
	php81-openssl git postgresql-client sudo php81-pecl-xdebug rsync tzdata && \
	sed -i 's/\(memory_limit =\) 128M/\1 256M/' /etc/php81/php.ini && \
	sed -i -e 's/^listen = 127.0.0.1:9000/listen = 9000/' \
		-e 's/;\(clear_env\) = .*/\1 = no/i' \
		-e 's/^\(user\|group\) = .*/\1 = app/i' \
		-e 's/;\(php_admin_value\[error_log\]\) = .*/\1 = \/tmp\/error.log/' \
		-e 's/;\(php_admin_flag\[log_errors\]\) = .*/\1 = on/' \
			/etc/php81/php-fpm.d/www.conf && \
	mkdir -p /var/www ${SCRIPT_ROOT}/config.d

ADD --chmod=0755 startup.sh ${SCRIPT_ROOT}
ADD --chmod=0755 updater.sh ${SCRIPT_ROOT}
ADD --chmod=0755 dcron.sh ${SCRIPT_ROOT}
ADD --chmod=0755 backup.sh /etc/periodic/weekly/backup

ADD index.php ${SCRIPT_ROOT}
ADD config.docker.php ${SCRIPT_ROOT}

ARG ORIGIN_REPO_MAIN=https://git.tt-rss.org/fox/tt-rss.git
ARG ORIGIN_REPO_XACCEL=https://git.tt-rss.org/fox/ttrss-nginx-xaccel.git
ARG ORIGIN_COMMIT=

ENV ORIGIN_REPO_MAIN=${ORIGIN_REPO_MAIN}
ENV ORIGIN_REPO_XACCEL=${ORIGIN_REPO_XACCEL}
ENV ORIGIN_COMMIT=${ORIGIN_COMMIT}

RUN git clone --depth=1 ${ORIGIN_REPO_XACCEL} ${SRC_DIR}/plugins.local/nginx_xaccel

ENV OWNER_UID=1000
ENV OWNER_GID=1000

ENV PHP_WORKER_MAX_CHILDREN=5
ENV PHP_WORKER_MEMORY_LIMIT=256M

# these are applied on every startup, if set
ENV ADMIN_USER_PASS=""
# see classes/UserHelper.php ACCESS_LEVEL_*
# setting this to -2 would effectively disable built-in admin user
# unless single user mode is enabled
ENV ADMIN_USER_ACCESS_LEVEL=""

# these are applied unless user already exists
ENV AUTO_CREATE_USER=""
ENV AUTO_CREATE_USER_PASS=""
ENV AUTO_CREATE_USER_ACCESS_LEVEL="0"

# TODO: remove prefix from container variables not used by tt-rss itself:
#
# - TTRSS_NO_STARTUP_PLUGIN_UPDATES -> NO_STARTUP_PLUGIN_UPDATES
# - TTRSS_XDEBUG_... -> XDEBUG_...

# don't try to update local plugins on startup
ENV TTRSS_NO_STARTUP_PLUGIN_UPDATES=""

# TTRSS_XDEBUG_HOST defaults to host IP if unset
ENV TTRSS_XDEBUG_ENABLED=""
ENV TTRSS_XDEBUG_HOST=""
ENV TTRSS_XDEBUG_PORT="9000"

ENV TTRSS_DB_TYPE="pgsql"
ENV TTRSS_DB_HOST="db"
ENV TTRSS_DB_PORT="5432"

ENV TTRSS_MYSQL_CHARSET="UTF8"
ENV TTRSS_PHP_EXECUTABLE="/usr/bin/php81"
ENV TTRSS_PLUGINS="auth_internal, note, nginx_xaccel"

CMD ${SCRIPT_ROOT}/startup.sh
