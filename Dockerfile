FROM ubuntu:20.04
LABEL maintainer Ascensio System SIA <support@onlyoffice.com>

ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8 DEBIAN_FRONTEND=noninteractive PG_VERSION=12

ARG ONLYOFFICE_VALUE=onlyoffice

RUN echo "#!/bin/sh\nexit 0" > /usr/sbin/policy-rc.d 
RUN apt-get -y update 
RUN apt-get -yq install wget apt-transport-https gnupg locales 
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 0x8320ca65cb2de8e5 
RUN locale-gen en_US.UTF-8 
RUN echo ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true | debconf-set-selections 
RUN apt-get -yq install
RUN apt-get -yq install adduser
RUN apt-get -yq install apt-utils
RUN apt-get -yq install bomstrip
RUN apt-get -yq install certbot
RUN apt-get -yq install curl
RUN apt-get -yq install gconf-service
RUN apt-get -yq install htop
RUN apt-get -yq install libasound2
RUN apt-get -yq install libboost-regex-dev
RUN apt-get -yq install libcairo2
RUN apt-get -yq install libcurl3-gnutls
RUN apt-get -yq install libcurl4
RUN apt-get -yq install libgtk-3-0
RUN apt-get -yq install libnspr4
RUN apt-get -yq install libnss3
RUN apt-get -yq install libstdc++6
RUN apt-get -yq install libxml2
RUN apt-get -yq install libxss1
RUN apt-get -yq install libxtst6
RUN apt-get -yq install mysql-client
RUN apt-get -yq install nano
RUN apt-get -yq install net-tools
RUN apt-get -yq install netcat
RUN apt-get -yq install nginx-extras
RUN apt-get -yq install postgresql
RUN apt-get -yq install postgresql-client
RUN apt-get -yq install pwgen
RUN apt-get -yq install rabbitmq-server
RUN apt-get -yq install redis-server
RUN apt-get -yq install software-properties-common
RUN apt-get -yq install sudo
RUN apt-get -yq install supervisor
RUN apt-get -yq install ttf-mscorefonts-installer
RUN apt-get -yq install xvfb
RUN apt-get -yq install zlib1g 
RUN if [  $(ls -l /usr/share/fonts/truetype/msttcorefonts | wc -l) -ne 61 ]; \
        then echo 'msttcorefonts failed to download'; exit 1; fi  
RUN echo "SERVER_ADDITIONAL_ERL_ARGS=\"+S 1:1\"" | tee -a /etc/rabbitmq/rabbitmq-env.conf 
RUN sed -i "s/bind .*/bind 127.0.0.1/g" /etc/redis/redis.conf 
RUN sed 's|\(application\/zip.*\)|\1\n    application\/wasm wasm;|' -i /etc/nginx/mime.types 
RUN pg_conftool $PG_VERSION main set listen_addresses 'localhost' 
RUN service postgresql restart 
RUN sudo -u postgres psql -c "CREATE DATABASE $ONLYOFFICE_VALUE;" 
RUN sudo -u postgres psql -c "CREATE USER $ONLYOFFICE_VALUE WITH password '$ONLYOFFICE_VALUE';" 
RUN sudo -u postgres psql -c "GRANT ALL privileges ON DATABASE $ONLYOFFICE_VALUE TO $ONLYOFFICE_VALUE;" && \ 
RUN service postgresql stop 
RUN service redis-server stop 
RUN service rabbitmq-server stop 
RUN service supervisor stop 
RUN service nginx stop 
RUN rm -rf /var/lib/apt/lists/*

COPY config /app/ds/setup/config/
COPY run-document-server.sh /app/ds/run-document-server.sh

EXPOSE 80 443

ARG REPO_URL="deb http://download.onlyoffice.com/repo/debian squeeze main"
ARG COMPANY_NAME=onlyoffice
ARG PRODUCT_NAME=documentserver

ENV COMPANY_NAME=$COMPANY_NAME \
    PRODUCT_NAME=$PRODUCT_NAME

RUN echo "$REPO_URL" | tee /etc/apt/sources.list.d/ds.list
RUN apt-get -y update 
RUN service postgresql start 
RUN apt-get -yq install $COMPANY_NAME-$PRODUCT_NAME 
RUN service postgresql stop 
RUN service supervisor stop 
RUN chmod 755 /app/ds/*.sh 
RUN rm -rf /var/log/$COMPANY_NAME 
RUN rm -rf /var/lib/apt/lists/*

VOLUME /var/log/$COMPANY_NAME /var/lib/$COMPANY_NAME /var/www/$COMPANY_NAME/Data /var/lib/postgresql /var/lib/rabbitmq /var/lib/redis /usr/share/fonts/truetype/custom

ENTRYPOINT ["/app/ds/run-document-server.sh"]
