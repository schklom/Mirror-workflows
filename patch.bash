#!/usr/bin/env bash

echo pwd
pwd

echo "ls -ahl"
ls -ahl

echo "ls -ahl patch"
ls -ahl patch

cp Dockerfile Dockerfile.bak
echo "RUN apk add --no-cache git" >> Dockerfile
echo "RUN git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset ds" >> Dockerfile
echo "RUN mkdir -p /usr/share/nginx/html /usr/share/nginx/gif" >> Dockerfile
echo "RUN mv /ds/images/*.jpg /usr/share/nginx/html/" >> Dockerfile
echo "RUN mv /ds/videos/*.gif /usr/share/nginx/gif/" >> Dockerfile
echo "RUN rm -rf /ds" >> Dockerfile

echo "Changes in Dockerfile"
diff Dockerfile.bak Dockerfile
rm Dockerfile.bak

echo "FINISHED"
exit 0
