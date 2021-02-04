FROM debian

USER root

ARG DEBIAN_FRONTEND=noninteractive

LABEL maintainer="BarnardCollier" \
      version="0.9" \
      description="pi.alert in a docker container"

RUN apt-get -qq update > /dev/null && apt-get -qq upgrade -y > /dev/null && apt-get -qq install -y apt-utils > /dev/null

RUN apt-get -qq install -y curl cron sudo lighttpd php php-cgi php-fpm php-sqlite3 arp-scan dnsutils python3 > /dev/null

RUN mkdir -p /opt/pialert

COPY pialert /opt/pialert

COPY start.sh /opt/pialert/docker_start.sh

RUN lighttpd-enable-mod fastcgi-php && \
    chgrp -R www-data /opt/pialert/db && \
    chmod -R g+rwx /opt/pialert/db && \
    chmod go+x /opt/pialert && \
    ln -s /opt/pialert/front  /var/www/html/pialert && \
    cp /opt/pialert/install/pialert_front.conf /etc/lighttpd/conf-available && \
    ln -s /etc/lighttpd/conf-available/pialert_front.conf /etc/lighttpd/conf-enabled/pialert_front.conf && \
    mv "/var/www/html/index.lighttpd.html"  "/var/www/html/index.lighttpd.html.orig" && \
    cp "/opt/pialert/install/index.html" "/var/www/html/index.html" && \
    /etc/init.d/lighttpd restart && \
    (crontab -l 2>/dev/null || : ; cat /opt/pialert/install/pialert.cron) | crontab -

VOLUME ["/opt/pialert/config"]

EXPOSE 80

CMD ["/bin/bash", "/opt/pialert/docker_start.sh"]
