#!/bin/bash

# Inspired by https://github.com/cldrn/rainmap-lite/wiki/INSTALL
# and https://github.com/cldrn/rainmap-lite/blob/master/README.md
# and https://jerrygamblin.com/2016/08/30/rainmap-container/

# Config for setup.sh
APP_ROOT_PATH=${APP_ROOT_PATH}
HTTP_PORT=${HTTP_PORT}
LOG_PATH=${LOG_PATH}
ADMIN_USER=${ADMIN_USER}
ADMIN_PASS=${ADMIN_PASS}
ADMIN_EMAIL=${ADMIN_EMAIL}

# Config for namper-cronjob.py
BASE_URL=${BASE_URL}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_SERVER=${SMTP_SERVER}
SMTP_PORT=${SMTP_PORT}
SMTP_DOMAIN_NAME=${SMTP_DOMAIN_NAME}

# Create the database schema
python3 manage.py migrate

# Load the default scanning profiles data
python3 manage.py loaddata nmapprofiles

# For security RainmapLite does not have any default administrative user out of box
python3 manage.py createsuperuser

# Setup the crontab job
crontab -l > cronjob_list.txt
echo "*/5 * * * * cd ${APP_ROOT_PATH} && python3 nmaper-cronjob.py >> $LOG_PATH 2>&1" >> cronjob_list.txt
crontab cronjob_list.txt
rm cronjob_list.txt

# Add the admin user
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('${ADMIN_USER}', '${ADMIN_EMAIL}', '${ADMIN_PASS}')" | python3 manage.py shell

# Run the app
python3 manage.py runserver 0.0.0.0:${HTTP_PORT}
