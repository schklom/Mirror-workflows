#!/usr/bin/env bash

cp Dockerfile Dockerfile.bak
echo "RUN apk add --no-cache git" >> Dockerfile
echo "RUN git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset ds" >> Dockerfile
echo "RUN ls -ahl ds" >> Dockerfile
echo "RUN pwd" >> Dockerfile
echo "COPY ds/images/*.jpg /usr/share/nginx/html/" >> Dockerfile
echo "COPY ds/videos/*.gif /usr/share/nginx/gif/" >> Dockerfile
echo "RUN rm -rf ds" >> Dockerfile

echo "Changes in Dockerfile"
diff Dockerfile.bak Dockerfile
rm Dockerfile.bak
