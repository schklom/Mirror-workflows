FROM duplicati/duplicati:latest

# Put rclone binary in /usr/bin/rclone
# https://rclone.org/downloads/#script-download-and-install
RUN sudo -v ; curl https://rclone.org/install.sh | sudo bash
