FROM registry.fakecake.org/nginx:alpine

HEALTHCHECK CMD curl --fail http://localhost/tt-rss/index.php || exit 1

COPY nginx.conf /etc/nginx/templates/nginx.conf.template

# By default, nginx will send the php requests to "app" server, but this server
# name can be overridden at runtime by passing an APP_UPSTREAM env var
ENV APP_UPSTREAM=${APP_UPSTREAM:-app}

# It's necessary to set the following NGINX_ENVSUBST_OUTPUT_DIR env var to tell
# nginx to replace the env vars of /etc/nginx/templates/nginx.conf.template
# and put the result in /etc/nginx/nginx.conf (instead of /etc/nginx/conf.d/nginx.conf)
# See https://github.com/docker-library/docs/tree/master/nginx#using-environment-variables-in-nginx-configuration-new-in-119
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
