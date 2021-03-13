# TTRSS image with file logging

The original image doesn't record the errors to a file, but displays it in the container instead (to /dev/stderr).
This image records the logs in `/var/log/error.log` instead, when the container `app` is run with the environment variable `- TTRSS_LOG_DESTINATION=` (set to empty).
The `app` container will not have any error logs anymorewhen running `docker logs app`.
