FROM python:3.9-slim-buster

RUN python -m pip install --upgrade setuptools pip wheel
RUN python -m pip install --upgrade pyyaml
RUN python -m pip install Firefly-III-API-Client

RUN mkdir /opt/cryptocom-csv-firefly-iii
RUN mkdir /var/cryptocom-csv-firefly-iii
RUN mkdir /var/cryptocom-csv-firefly-iii/csv-to-import
RUN mkdir /var/cryptocom-csv-firefly-iii/csv-import-history
RUN mkdir /var/cryptocom-csv-firefly-iii/csv-import-failed

COPY ./ /opt/cryptocom-csv-firefly-iii/

VOLUME ["/var/cryptocom-csv-firefly-iii/csv-to-import", "/var/cryptocom-csv-firefly-iii/csv-import-history", "/var/cryptocom-csv-firefly-iii/csv-import-failed"]

CMD cd /opt/cryptocom-csv-firefly-iii && python src/main.py
