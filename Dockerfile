FROM schklom/ttrss-app

RUN sed -i 's;\(php_admin_value\[error_log\]\) = .*;\1 = /var/log/error.log;' /etc/php*/php-fpm.d/www.conf
RUN touch /var/log/error.log
RUN chown ${OWNER_UID}:${OWNER_GID} /var/log/error.log
