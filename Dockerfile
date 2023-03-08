FROM ubuntu:latest
RUN apt-get update
RUN apt-get install sqlite3 git nmap python3 python3-pip -y

# Import run.bash
COPY . /rainmap-lite-docker

# Import original rainmap-lite repo
RUN git clone https://github.com/cldrn/rainmap-lite /rainmap-lite

WORKDIR /rainmap-lite/rainmap-lite

# Install the required Python libs
RUN pip install -r requirement.txt

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

CMD /rainmap-lite-docker/run.bash
