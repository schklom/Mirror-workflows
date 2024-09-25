ARG PROXY_REGISTRY
FROM ${PROXY_REGISTRY}nginxinc/nginx-unprivileged:1-alpine

COPY ./phpdoc /usr/share/nginx/html/ttrss-docs
COPY .docker/phpdoc/redirects.conf /etc/nginx/conf.d/
