FROM schklom/ttrss-app

RUN sed -i -e 's/^listen = 127.0.0.1:9000/listen = 9000/' \
        -e 's/;\(clear_env\) = .*/\1 = no/i' \
        -e 's/^\(user\|group\) = .*/\1 = app/i' \
        -e 's/;\(php_admin_value\[error_log\]\) = .*/\1 = \/var\/log\/error.log/' \
        -e 's/;\(php_admin_flag\[log_errors\]\) = .*/\1 = on/' \
            /etc/php8/php-fpm.d/www.conf && \
        touch /var/log/error.log && \
        chown ${OWNER_UID}:${OWNER_GID} /var/log/error.log
