#!/usr/bin/env bash

CONTAINER_ALREADY_STARTED="CONTAINER_ALREADY_STARTED_PLACEHOLDER"
if [ ! -e $CONTAINER_ALREADY_STARTED ]; then
    touch $CONTAINER_ALREADY_STARTED
    echo "-- First container startup --"
    echo 'starting ligghtpd engine...'
    /etc/init.d/lighttpd restart
    echo 'download most recent version of vendors file'
    stdbuf -i0 -o0 -e0 python3 /opt/pialert/back/pialert.py update_vendors_silent
    echo 'scanning local network'
    stdbuf -i0 -o0 -e0 python3 /opt/pialert/back/pialert.py 1
else
    echo "-- Not first container startup --"
    if pgrep lighttpd &> /dev/null ; then sudo killall lighttpd ; fi
    /etc/init.d/lighttpd restart
fi

tail -f /dev/null
