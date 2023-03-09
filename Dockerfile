FROM ubuntu:latest

RUN apt-get update

# tzdata gets installed with the (I guess) cron package
# This is to avoid waiting indefinitely for user input
ARG DEBIAN_FRONTEND=noninteractive
ARG TZ=Europe/Berlin
RUN apt-get install -y tzdata

RUN apt-get install -y sqlite3 git python3 python3-pip nmap cron
# Get around dependency errors with "pip install lxml" on armv7
RUN apt-get install -y python3-lxml python3-django python3-dotenv

# Import run.bash
COPY . /rainmap-lite-docker

# Import original rainmap-lite repo
RUN git clone https://github.com/cldrn/rainmap-lite /rainmap-lite

WORKDIR /rainmap-lite/rainmap-lite

# Install the required Python libs
# RUN pip install -r requirement.txt # Packages too old, error
# RUN pip install Django
# RUN pip install lxml
# RUN pip install python-dotenv
RUN pip install pytz

# Config for setup.sh
ENV APP_ROOT_PATH=${APP_ROOT_PATH:-/opt/rainmap-lite/}
ENV HTTP_PORT=${HTTP_PORT:-8000}
ENV LOG_PATH=${LOG_PATH:-/var/log/nmaper.log}
ENV ADMIN_USER=${ADMIN_USER:-admin}
ENV ADMIN_PASS=${ADMIN_PASS:-admin}
ENV ADMIN_EMAIL=${ADMIN_EMAIL:-""}

# Config for namper-cronjob.py
ENV BASE_URL=${BASE_URL:-"http://127.0.0.1:${HTTP_PORT}"}
ENV SMTP_USER=${SMTP_USER:-""}
ENV SMTP_PASS=${SMTP_PASS:-""}
ENV SMTP_SERVER=${SMTP_SERVER:-""}
ENV SMTP_PORT=${SMTP_PORT:-""}
ENV SMTP_DOMAIN_NAME=${SMTP_DOMAIN_NAME:-""}

CMD /rainmap-lite-docker/run.bash
