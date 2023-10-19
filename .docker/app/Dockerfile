FROM registry.fakecake.org/docker.io/alpine:3.18
EXPOSE 9000/tcp

ENV SCRIPT_ROOT=/opt/tt-rss
ENV SRC_DIR=/src/tt-rss/

RUN apk add --no-cache dcron php82 php82-fpm php82-phar php82-sockets php82-pecl-apcu \
	php82-pdo php82-gd php82-pgsql php82-pdo_pgsql php82-xmlwriter php82-opcache \
	php82-mbstring php82-intl php82-xml php82-curl php82-simplexml \
	php82-session php82-tokenizer php82-dom php82-fileinfo php82-ctype \
	php82-json php82-iconv php82-pcntl php82-posix php82-zip php82-exif \
	php82-openssl git postgresql-client sudo php82-pecl-xdebug rsync tzdata && \
	sed -i 's/\(memory_limit =\) 128M/\1 256M/' /etc/php82/php.ini && \
	sed -i -e 's/^listen = 127.0.0.1:9000/listen = 9000/' \
		-e 's/;\(clear_env\) = .*/\1 = no/i' \
		-e 's/;\(pm.status_path = \/status\)/\1/i' \
		-e 's/;\(pm.status_listen\) = .*/\1 = 9001/i' \
		-e 's/^\(user\|group\) = .*/\1 = app/i' \
		-e 's/;\(php_admin_value\[error_log\]\) = .*/\1 = \/tmp\/error.log/' \
		-e 's/;\(php_admin_flag\[log_errors\]\) = .*/\1 = on/' \
			/etc/php82/php-fpm.d/www.conf && \
	mkdir -p /var/www ${SCRIPT_ROOT}/config.d

ARG CI_COMMIT_BRANCH
ENV CI_COMMIT_BRANCH=${CI_COMMIT_BRANCH}

ARG CI_COMMIT_SHORT_SHA
ENV CI_COMMIT_SHORT_SHA=${CI_COMMIT_SHORT_SHA}

ARG CI_COMMIT_TIMESTAMP
ENV CI_COMMIT_TIMESTAMP=${CI_COMMIT_TIMESTAMP}

ARG CI_COMMIT_SHA
ENV CI_COMMIT_SHA=${CI_COMMIT_SHA}

ADD .docker/app/startup.sh ${SCRIPT_ROOT}
ADD .docker/app/updater.sh ${SCRIPT_ROOT}
ADD .docker/app/dcron.sh ${SCRIPT_ROOT}
ADD .docker/app/backup.sh /etc/periodic/weekly/backup

RUN chmod 0755 ${SCRIPT_ROOT}/*.sh

ADD .docker/app/index.php ${SCRIPT_ROOT}
ADD .docker/app/config.docker.php ${SCRIPT_ROOT}

COPY . ${SRC_DIR}

ARG ORIGIN_REPO_XACCEL=https://git.tt-rss.org/fox/ttrss-nginx-xaccel.git

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
ENV TTRSS_PHP_EXECUTABLE="/usr/bin/php82"
ENV TTRSS_PLUGINS="auth_internal, note, nginx_xaccel"

CMD ${SCRIPT_ROOT}/startup.sh
