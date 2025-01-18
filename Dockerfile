FROM nodered/node-red
# RUN npm install passport-openidconnect
USER root
RUN apk add strace
USER node-red

RUN strace -f npm install passport-openidconnect
