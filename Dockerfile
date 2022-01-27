FROM homeassistant/home-assistant:stable

# Add wakeonlan according to https://pypi.org/project/wakeonlan/ and remove useless data
#RUN pip3 install --no-cache-dir --no-index --only-binary=:all wakeonlan
# Put your python scripts in the folder below, according to https://www.home-assistant.io/integrations/python_script/
#RUN mkdir /config/python_scripts

# Add custom store (https://github.com/hacs/integration and https://hacs.xyz/docs/setup/download#home-assistant-core)
RUN wget -O - https://get.hacs.xyz | bash -
