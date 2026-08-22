#!/usr/bin/env bash

cp Dockerfile Dockerfile.bak
echo "RUN git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset /tmp/ds" >> Dockerfile
echo "COPY /tmp/ds/images/*.jpg /usr/share/nginx/html/" >> Dockerfile
echo "COPY /tmp/ds/videos/*.gif /usr/share/nginx/gif/" >> Dockerfile
echo "RUN rm -rf /tmp/ds" >> Dockerfile

echo "Changes in Dockerfile"
diff Dockerfile.bak Dockerfile
rm Dockerfile.bak
