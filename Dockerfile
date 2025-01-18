FROM nodered/node-red
# RUN npm install passport-openidconnect
RUN strace -f npm install passport-openidconnect
