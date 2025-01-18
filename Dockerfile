FROM nodered/node-red
# RUN npm install passport-openidconnect
RUN /sbin/apk add strace
RUN strace -f npm install passport-openidconnect
