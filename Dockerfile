FROM nodered/node-red
# RUN npm install passport-openidconnect
RUN apt update && apt install -y strace
RUN strace -f npm install passport-openidconnect
