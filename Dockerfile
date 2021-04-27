FROM fireflyiii/csv-importer

RUN mkdir /opt/cryptocom-csv-firefly-iii
RUN mkdir /var/cryptocom-csv-firefly-iii
RUN mkdir /var/cryptocom-csv-firefly-iii/csv-to-import
RUN mkdir /var/cryptocom-csv-firefly-iii/csv-import-history
RUN mkdir /var/cryptocom-csv-firefly-iii/csv-import-failed

COPY ./ /opt/crypto-com-csv-firefly-iii/

VOLUME ["/var/cryptocom-csv-firefly-iii/csv-to-import", "/var/cryptocom-csv-firefly-iii/csv-import-history", "/var/cryptocom-csv-firefly-iii/csv-import-failed"]
