FROM alpine:latest

# GMVAULT_DIR allows using a location that is not the default $HOME/.gmvault.
ENV GMVAULT_DIR="/data" \
	GMVAULT_EMAIL_ADDRESS="test@example.com" \
	GMVAULT_FULL_SYNC_SCHEDULE="1 3 * * 0" \
	GMVAULT_QUICK_SYNC_SCHEDULE="1 2 * * 1-6" \
	GMVAULT_DEFAULT_GID="9000" \
	GMVAULT_DEFAULT_UID="9000" \
	CRONTAB="/var/spool/cron/crontabs/gmvault"

VOLUME $GMVAULT_DIR
RUN mkdir /app

# Set up environment.
RUN apk add --update bash
RUN apk add --update ca-certificates
RUN apk add --update mailx
RUN apk add --update py-pip
RUN apk add --update python3
RUN apk add --update ssmtp
RUN apk add --update shadow
RUN apk add --update su-exec
RUN apk add --update tzdata
RUN  pip install --upgrade pip
RUN  pip install gmvault
RUN  rm -rf /var/cache/apk/*
RUN  addgroup --gid "$GMVAULT_DEFAULT_GID" gmvault
RUN  adduser \
		--no-create-home `# No home directory` \
		--disabled-password `# Don't assign a password` \
		--uid "$GMVAULT_DEFAULT_UID" \
		--shell "/bin/bash" \
		--ingroup "gmvault" \
		gmvault

# Copy cron jobs.
COPY backup_quick.sh /app/
COPY backup_full.sh /app/

# Set up entry point.
COPY start.sh /app/
WORKDIR /app
ENTRYPOINT ["/app/start.sh"]
