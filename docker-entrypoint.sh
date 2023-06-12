#!/bin/bash

echo "Starting Xvfb"
Xvfb :99 -ac &
sleep 2

export DISPLAY=:99
echo "Executing npm as user node"

su -mc "cd /app && npm run start" node
