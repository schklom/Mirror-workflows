FROM duplicati/duplicati:latest

ARG DEBIAN_FRONTEND=noninteractive

# Install unzip
RUN apt-get update
RUN apt-get -y --no-install-recommends install unzip
# Put rclone binary in /usr/bin/rclone
# https://rclone.org/downloads/#script-download-and-install
RUN curl https://rclone.org/install.sh | bash
