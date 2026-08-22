#!/usr/bin/env bash

cp Dockerfile Dockerfile.bak

# Copy data files into the image to avoid forcing the user to do it
cat << 'EOF' >> Dockerfile
RUN apk add --no-cache git
RUN git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset ds
RUN mkdir -p /usr/share/nginx/html /usr/share/nginx/gif
RUN mv /ds/images/*.jpg /usr/share/nginx/html/
RUN mv /ds/videos/*.gif /usr/share/nginx/gif/
RUN rm -rf /ds" >> Dockerfile
EOF

# Allow API_HOST and API_PORT environment variables
cat << 'EOF' >> Dockerfile
RUN sed -i 's|proxy_pass http://api:3000|proxy_pass http://${API_HOST}:${API_PORT}|' "/etc/nginx/conf.d/default.conf"
RUN mv "/etc/nginx/conf.d/default.conf" "/etc/nginx/templates/default.conf.template"
ENV API_HOST=api
ENV API_HOST=3000
ENV NGINX_ENVSUBST_FILTER="API_HOST API_PORT"
EOF

echo "Changes in Dockerfile"
diff Dockerfile.bak Dockerfile || true

echo "Delete Dockerfile.bak"
rm -f Dockerfile.bak
