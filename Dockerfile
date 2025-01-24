FROM linuxserver/homeassistant:latest

# To ping (iputils), and to speak words into any audio output device (espeak + alsa-utils)
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
        chown -R 33:33 "${PY_LOCAL_PATH}"; \
    fi

# Get python package requirements for the watchman and waste collection addons
RUN PYTHONPATH=$(find /usr/local/lib -maxdepth 1 -name python* -type d); \
    URL="https://raw.githubusercontent.com/dummylabs/thewatchman/refs/heads/main/requirements_test.txt"; \
    # Fetch the manifest.json and extract required packages
    curl -s $URL | grep -v '[-]r requirements.txt' > /tmp/requirements.txt; \
    echo "Installing required packages"; \
    python3 -m pip install -r /tmp/requirements.txt; \
    rm /tmp/requirements.txt

RUN PYTHONPATH=$(find /usr/local/lib -maxdepth 1 -name python* -type d); \
    URL="https://raw.githubusercontent.com/mampfes/hacs_waste_collection_schedule/refs/heads/master/requirements.txt"; \
    # Fetch the manifest.json and extract required packages
    curl -s $URL | grep -v '[-]r requirements.txt' > /tmp/requirements.txt; \
    echo "Installing required packages"; \
    python3 -m pip install -r /tmp/requirements.txt; \
    rm /tmp/requirements.txt

# Redo a chown just in case
RUN PYTHONPATH=$(find /usr/local/lib -maxdepth 1 -name python* -type d); \
    chown -R 33:33 "${PYTHONPATH}"
RUN
