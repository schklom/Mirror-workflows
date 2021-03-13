FROM schklom/ttrss-app

RUN sed -i -e 's/\(php_admin_value\[error_log\]\) = .*/\1 = \/var\/log\/error.log/' \
                /etc/php8/php-fpm.d/www.conf && \
        touch /var/log/error.log && \
        chown ${OWNER_UID}:${OWNER_GID} /var/log/error.log
