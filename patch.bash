#!/usr/bin/env bash

cp Dockerfile Dockerfile.bak

# Copy data files into the image to avoid forcing the user to do it
echo "RUN apk add --no-cache git" >> Dockerfile
echo "RUN git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset ds" >> Dockerfile
echo "RUN mkdir -p /usr/share/nginx/html /usr/share/nginx/gif" >> Dockerfile
echo "RUN mv /ds/images/*.jpg /usr/share/nginx/html/" >> Dockerfile
echo "RUN mv /ds/videos/*.gif /usr/share/nginx/gif/" >> Dockerfile
echo "RUN rm -rf /ds" >> Dockerfile

# Allow API_HOST and API_PORT environment variables
echo 'RUN sed -i \'s|proxy_pass http://api:3000|proxypass proxy_pass http://${API_HOST}:${API_PORT}|\' "/etc/nginx/conf.d/default.conf"' >> Dockerfile
echo 'RUN mv "/etc/nginx/conf.d/default.conf" "/etc/nginx/templates/default.conf.template"' >> Dockerfile
echo "ENV API_HOST=api" >> Dockerfile
echo "ENV API_HOST=3000" >> Dockerfile
echo 'ENV NGINX_ENVSUBST_FILTER="API_HOST API_PORT"'

echo "Changes in Dockerfile"
diff Dockerfile.bak Dockerfile || true

echo "Delete Dockerfile.bak"
rm -f Dockerfile.bak
