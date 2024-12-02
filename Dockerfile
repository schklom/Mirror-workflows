FROM duplicati/duplicati:latest

# Put rclone binary in /usr/bin/rclone
# https://rclone.org/downloads/#script-download-and-install
RUN curl https://rclone.org/install.sh | bash
