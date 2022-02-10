#!/bin/bash
# If /fmd exists and is a directory and is empty, then fill it with user data
if [[ -d /fmd ]] && [[ -z "$(ls -A /fmd)" ]]
then
    mv /go/src/fmd/objectbox/ /fmd/
# Otherwise, 
else
    /go/src/fmd/cmd/fmdserver
fi
