FROM nodered/node-red
# RUN npm install passport-openidconnect
RUN apk add strace
RUN strace -f npm install passport-openidconnect
