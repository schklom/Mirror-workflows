FROM ghcr.io/linuxserver/homeassistant:latest

RUN apk update && \
    apk add --no-cache iputils espeak alsa-utils && \
    apk cache clean

# To avoid the mess in https://github.com/linuxserver/docker-homeassistant/blob/main/root/etc/s6-overlay/s6-rc.d/init-config-homeassistant/run
RUN find /usr/local/lib -maxdepth 1 -name python* -type d | cut -d " " -f 1 | sed -E "s/.bak$//" > py_path
RUN PY_LOCAL_PATH=$(cat py_path); if [[ -d "${PY_LOCAL_PATH}.bak" ]]; then touch "do_the_rest"; fi
RUN PY_LOCAL_PATH=$(cat py_path); \
    echo "py_path=${PY_LOCAL_PATH}"; \
    if [[ -d "${PY_LOCAL_PATH}.bak" ]]; then \
        echo -e "\nDeleting ${PY_LOCAL_PATH}\n"; \
        rm -rf "${PY_LOCAL_PATH}"; \
        \
        echo -e "\nRenaming ${PY_LOCAL_PATH}.bak to ${PY_LOCAL_PATH}\n"; \
        mv "${PY_LOCAL_PATH}.bak" "${PY_LOCAL_PATH}"; \
        \
        echo -e "\nls -alh /usr/local/lib\n"; \
        ls -alh "/usr/local/lib"; \
        \
        echo -e "\nChange ownership of the folder ${PY_LOCAL_PATH}\n"; \
        chown -R abc:abc "${PY_LOCAL_PATH}"; \
        \
        echo -e "\nls -alh /usr/local/lib\n"; \
        ls -alh "/usr/local/lib"; \
    fi

RUN find /usr/local/lib -maxdepth 1 -name python* -type d
