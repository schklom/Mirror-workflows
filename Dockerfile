FROM linuxserver/homeassistant:latest

RUN apk update && \
    apk add --no-cache iputils espeak alsa-utils 

# To avoid the mess in https://github.com/linuxserver/docker-homeassistant/blob/main/root/etc/s6-overlay/s6-rc.d/init-config-homeassistant/run
# This may introduce a overlayfs bug apparently, and this prevents letting PUID:PGID own the folder (https://github.com/linuxserver/docker-homeassistant/issues/116)
# But I don't have a bug on my server and I don't care about PUID:PGID, so this is fine
RUN PY_LOCAL_PATH=$(find /usr/local/lib -maxdepth 1 -name python* -type d | cut -d " " -f 1 | sed -E "s/.bak$//"); \
    echo "py_path=${PY_LOCAL_PATH}"; \
    if [[ -d "${PY_LOCAL_PATH}.bak" ]]; then \
        echo -e "\nDeleting ${PY_LOCAL_PATH}\n"; \
        rm -rf "${PY_LOCAL_PATH}"; \
        \
        echo -e "\nRenaming ${PY_LOCAL_PATH}.bak to ${PY_LOCAL_PATH}\n"; \
        mv "${PY_LOCAL_PATH}.bak" "${PY_LOCAL_PATH}"; \
        \
        echo -e "\nChange ownership of the folder ${PY_LOCAL_PATH}\n"; \
        chown -R abc:abc "${PY_LOCAL_PATH}"; \
    fi

# watchman integration requires this version, I need to force the downgrade
RUN PYTHONPATH=$(find /usr/local/lib -maxdepth 1 -name python* -type d) \
    python3 -m pip install --force-reinstall -vvv "prettytable==3.10.0"

# waste collection addon requires icalevents
# https://github.com/mampfes/hacs_waste_collection_schedule/blob/master/custom_components/waste_collection_schedule/manifest.json#L9
RUN PYTHONPATH=$(find /usr/local/lib -maxdepth 1 -name python* -type d) \
    python3 -m pip install -vvv icalendar icalevents beautifulsoup4 lxml pycryptodome
