# TTRSS image with file logging

The original image doesn't record the errors to a file, but displays it in the container instead (to /dev/stderr).
This image records the logs in `/var/log/error.log` instead, when the container `app` is run with the environment variable `- TTRSS_LOG_DESTINATION=` (set to empty).

The `app` container will not have any error logs anymorewhen running `docker logs app`.

It is necessary to create the error log file manually before running this image, and setting the right permissions.

On a standard Docker installation, these commands should be enough to create the error log
```
touch /path/to/the/error/log/you/want/error.log
# Replace 1000 with the user id you use in the environment variables
chown 1000:1000 /path/to/the/error/log/error.log
```

and make sure to mount the error log when running the container. This is an example of what you can write in your `docker-compose.yml`
```
version: "3.8"
services:
  app:
    image: schklom/ttrss-app:latest-with-filelogging
    container_name: ttrss # optional
    restart: "no" # optional
    volumes:
      - /path/to/the/error/log/error.log:/var/log/error.log
      - /path/to/the/ttrss/files:/var/www/html
    environment: &ttrssenv
      - TTRSS_DB_TYPE=pgsql
      - TTRSS_DB_HOST=ttrss_db
      - TTRSS_DB_NAME=abcd
      - TTRSS_DB_USER=abcd
      - TTRSS_DB_PASS=abcd
      # don't change this line below if you want file-logging
      - TTRSS_LOG_DESTINATION=
      # replace TTRSS_SELF_URL_PATH here with the url you will use to access ttrss
      - TTRSS_SELF_URL_PATH=http://192.168.0.1:8280/tt-rss/

  ttrss_db:
    image: postgres:13-alpine
    container_name: ttrss_db # optional
    restart: "no" # optional
    environment:
      - TZ=${TZ}
      - POSTGRES_DB=abcd
      - POSTGRES_USER=abcd
      - POSTGRES_PASSWORD=abcd

  ttrss_web_nginx:
    image: schklom/ttrss-web-nginx
    container_name: ttrss_web_nginx # optional
    restart: "no" # optional
    ports: # optional, you should use a reverse-proxy instead
      - 8280:80
    environment: *ttrssenv
    volumes:
      - /path/to/the/ttrss/files:/var/www/html:ro
```
