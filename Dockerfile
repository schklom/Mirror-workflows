FROM nodered/node-red
# RUN npm install passport-openidconnect
ARG DEBUG="*"
ARG npm_config_loglevel="silly"
RUN npm install passport-openidconnect --verbose
