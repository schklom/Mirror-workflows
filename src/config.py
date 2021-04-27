import os

try:
    firefly_iii_url = os.environ['FIREFLY_III_URL']
except KeyError as e:
    print("FIREFLY_III_URL needs to be set as environmental variable.")
    exit(-1)

try:
    firefly_iii_access_token = os.environ['FIREFLY_III_ACCESS_TOKEN']
except KeyError as e:
    print("FIREFLY_III_ACCESS_TOKEN needs to be set as environmental variable.")
    exit(-1)

try:
    firefly_validate_ssl = False if os.environ['FIREFLY_VALIDATE_SSL'].lower() == "false" else True
except KeyError as e:
    firefly_validate_ssl = True

try:
    import_interval = os.environ['IMPORT_INTERVAL']
except KeyError as e:
    import_interval = 60 * 5

try:
    source_directory = os.environ['IMPORT_DIRECTORY']
except KeyError as e:
    source_directory = "/var/cryptocom-csv-firefly-iii/csv-to-import"

try:
    history_directory = os.environ['HISTORY_DIRECTORY']
except KeyError as e:
    history_directory = "/var/cryptocom-csv-firefly-iii/csv-import-history"

try:
    failed_directory = os.environ['FAILED_DIRECTORY']
except KeyError as e:
    failed_directory = "/var/cryptocom-csv-firefly-iii/csv-import-failed"

try:
    debug_config_param = os.environ['DEBUG']
    debug = True if debug_config_param is not None else False
except KeyError as e:
    debug = False
