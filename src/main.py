import os
import shutil
import time
from pathlib import Path
from typing import List

from firefly_iii_client import AccountRead

from csv_schema import RawCryptoComCsvSchema
import config
import firefly_iii
from model import ImportRecord


def get_from_account(csv_record: RawCryptoComCsvSchema, accounts: List[AccountRead]) -> AccountRead or None:
    for account in accounts:
        if csv_record.currency == account.attributes.currency_code or \
                csv_record.currency == account.attributes.currency_symbol:
            return account
    return None


def get_to_account(csv_record: RawCryptoComCsvSchema, accounts: List[AccountRead]) -> AccountRead or None:
    for account in accounts:
        if csv_record.to_currency == account.attributes.currency_code or \
                csv_record.to_currency == account.attributes.currency_symbol:
            return account
    return None


def map_accounts_to_csv_records_in_files(files_to_import, firefly_accounts):
    for file_to_import in files_to_import:
        import_records = \
            map_accounts_to_csv_records(files_to_import.get(file_to_import).get("csv_records"), firefly_accounts)
        files_to_import.get(file_to_import).setdefault("import_records", import_records)

    for file_to_import in files_to_import:
        report = []
        failed_record = False
        for record_to_import in files_to_import.get(file_to_import).get("import_records"):
            if "supercharger_deposit" in record_to_import.csv_record.transaction_kind:
                continue
            if record_to_import.from_account is None or record_to_import.to_account is None:
                failed_record = True
                report.append("The transaction at " + str(record_to_import.csv_record.timestamp) +
                              " cannot be mapped to Firefly III accounts.")
        if failed_record:
            files_to_import.get(file_to_import).update(status=-2)
            files_to_import.get(file_to_import).update(report=report)


def map_accounts_to_csv_records(
        csv_records: List[RawCryptoComCsvSchema], firefly_accounts: List[AccountRead]) -> List[ImportRecord]:
    result = []
    for csv_record in csv_records:
        if "supercharger_deposit" in csv_record.transaction_kind:
            continue
        result.append(ImportRecord(get_from_account(csv_record, firefly_accounts),
                                   get_to_account(csv_record, firefly_accounts),
                                   csv_record))
    return result


def get_files_from_import_location() -> {}:
    result = {}
    files_in_import_directory = os.listdir(config.source_directory)
    for file_in_dir in files_in_import_directory:
        file_handle = open(Path(config.source_directory).joinpath(file_in_dir), 'r+')
        result.setdefault(file_in_dir, {"content": file_handle.readlines()[1:], "status": 0, "report": None})
    return result


def import_mappable_import_records(files_to_import):
    for file_to_import in files_to_import:
        if not files_to_import.get(file_to_import).get("status") == 0:
            continue
        for import_record in files_to_import.get(file_to_import).get("import_records"):
            firefly_iii.write_new_transaction(import_record)


def move_successful(files_to_import):
    for file_to_import in files_to_import:
        if not files_to_import.get(file_to_import).get("status") == 0:
            continue
        if config.debug:
            print("  - Moving file '" + file_to_import + "' to successful destination.")
            source_file = Path(config.source_directory).joinpath(file_to_import)
            target_file = Path(config.history_directory).joinpath(file_to_import)
            shutil.move(source_file, target_file)


def move_failed(files_to_import):
    for file_to_import in files_to_import:
        if files_to_import.get(file_to_import).get("status") == 0:
            continue
        if config.debug:
            print("  - Moving file '" + file_to_import + "' to failed destination.")
            source_file = Path(config.source_directory).joinpath(file_to_import)
            target_file = Path(config.failed_directory).joinpath(file_to_import)
            shutil.move(source_file, target_file)
            report_handle = \
                open(Path(config.failed_directory).joinpath("report_" + file_to_import.replace(".csv", ".txt")), "w+")
            report_handle.writelines(
                line + "\n"
                for line in files_to_import.get(file_to_import).get("report")
            )


def start():
    firefly_iii.connect()
    while True:
        print("Checking new csv files to import.")
        print("1. Check if there are new csv files to import")

        files_to_import = get_files_from_import_location()

        if len(files_to_import) == 0:
            print("  There are no new csv files to import.")
        else:
            print("  There are " + str(len(files_to_import)) + " new csv files to import.")
            for file_to_import in files_to_import:
                csv_records = [
                    RawCryptoComCsvSchema.get_from_csv_line(csv_line)
                    for csv_line in files_to_import.get(file_to_import).get("content")
                ]
                if len(csv_records) == 0:
                    print("  - There are no new csv records to import in file '" + file_to_import + "'.")
                    files_to_import.get(file_to_import).update(status=-1)
                    files_to_import.get(file_to_import).update(report="CSV file is empty.")
                else:
                    files_to_import.get(file_to_import).setdefault("csv_records", csv_records)

            print("2. Get Crypto.com accounts from Firefly III and prepare import")
            firefly_accounts = firefly_iii.get_cryptocom_accounts_from_firefly_iii()

            map_accounts_to_csv_records_in_files(files_to_import, firefly_accounts)

            print("3. Importing mappable transactions to Firefly III")
            import_mappable_import_records(files_to_import)

            print("4. Move the successfully imported csv to the import history destination")
            move_successful(files_to_import)

            print("5. Move failed csv files to the failed destination")
            move_failed(files_to_import)

        print("-- Going to sleep, waiting for the next iteration.")
        time.sleep(config.import_interval)


if config.debug:
    config.import_interval = 5

start()
