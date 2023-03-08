FROM ubuntu:latest
RUN apt-get update
RUN apt-get install sqlite3 git nmap python-pip  -y
RUN pip install --upgrade pip
RUN pip install lxml
RUN pip install Django
# RUN git clone https://github.com/cldrn/rainmap-lite /rainmap-lite
COPY . /rainmap-lite
RUN ls -alh
WORKDIR /rainmap-lite

# Config for setup.sh
ENV APP_ROOT_PATH=${APP_ROOT_PATH:-/opt/rainmap-lite/}
ENV HTTP_PORT=${HTTP_PORT:-8000}
ENV LOG_PATH=${LOG_PATH:-/var/log/nmaper.log}
ENV ADMIN_USER=${ADMIN_USER:-admin}
ENV ADMIN_PASS=${ADMIN_PASS:-admin}
ENV ADMIN_EMAIL=${ADMIN_EMAIL:-""}

# Config for namper-cronjob.py
ENV IP=${IP:-127.0.0.1}
ENV BASE_URL=${BASE_URL:-"http://${IP}:${HTTP_PORT}"}
ENV SMTP_USER=${SMTP_USER:-""}
ENV SMTP_PASS=${SMTP_PASS:-""}
ENV SMTP_SERVER=${SMTP_SERVER:-""}
ENV SMTP_PORT=${SMTP_PORT:-""}
ENV SMTP_DOMAIN_NAME=${SMTP_DOMAIN_NAME:-""}
ENV HTTP_PORT=${PORT}

CMD /rainmap-lite/run.bash
