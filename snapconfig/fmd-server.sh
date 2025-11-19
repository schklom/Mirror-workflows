#!/usr/bin/env bash

SRC="$SNAP/default.yml"
DST="$SNAP_USER_COMMON/config.yml"

# Copy config only if not present
if [[ ! -f "$DST" ]]; then
    # Create directory if needed
    DB_DST="$SNAP_USER_COMMON/db"
    mkdir -p "$DB_DST"

    cp "$SRC" "$DST"
    # Replace Keyword with DB_DST
    sed -i "s|\$DB_DST|$DB_DST|g" $DST
fi

# Start your actual app
exec "$SNAP/bin/fmd-server" "$@"
