import hashlib
from typing import List

import firefly_iii_client
import urllib3
from firefly_iii_client import AccountRead, ApiException

import config
from model import ImportRecord

firefly_config = None
urllib3.disable_warnings()

notes_identifier = "cryptocom-csv-firefly-iii"


def connect():
    global firefly_config
    if firefly_config is not None:
        return True

    try:
        print('--------------------------------------------------------')
        print('Trying to connect to your Firefly III account...')

        firefly_iii_client.configuration.verify_ssl = False

        configuration = firefly_iii_client.configuration.Configuration(
            host=config.firefly_iii_url
        )

        configuration.verify_ssl = config.firefly_validate_ssl
        configuration.access_token = config.firefly_iii_access_token

        with firefly_iii_client.ApiClient(configuration) as api_client:
            try:
                firefly_iii_client.AboutApi(api_client).get_about()
            except Exception as e:
                raise e

        print('Connection to your Firefly III account established.')
        print('--------------------------------------------------------')
        firefly_config = configuration
        return True
    except Exception as e:
        if config.debug:
            print("Cannot get data from server. Check the connection or your access token configuration." % e)
        else:
            print("Cannot get data from server. Check the connection or your access token configuration.")
        exit(-600)


def hash_transaction(values: List[str], tags):
    hashed_result = ""
    for value in values:
        hashed_result += str(value)
    for tag in tags:
        hashed_result += tag
    hash_object = hashlib.sha256(hashed_result.encode())
    hex_dig = hash_object.hexdigest()
    return hex_dig


def write_new_transaction(import_record: ImportRecord):
    with firefly_iii_client.ApiClient(firefly_config) as api_client:
        transaction_api = firefly_iii_client.TransactionsApi(api_client)
        tags = ["crypto.com"]
        if config.debug:
            tags.append('dev')

        if import_record.csv_record.transaction_kind == "'viban_purchase'":
            transaction_type = "BUY"
            currency = import_record.csv_record.currency
            security = import_record.csv_record.to_currency
        else:
            transaction_type = "UNKNOWN"
            currency = import_record.csv_record.to_currency
            security = import_record.csv_record.currency

        description = "Crypto.com | " + transaction_type + " | Currency: " + currency + " | Security: " + security

        amount = import_record.csv_record.amount
        split = firefly_iii_client.TransactionSplit(
            amount=amount if amount > 0 else amount * -1,
            date=import_record.csv_record.timestamp,
            description=description,
            type='transfer',
            tags=tags,
            reconciled=True,
            source_name=import_record.from_account.attributes.name,
            source_type=import_record.from_account.attributes.type,
            currency_code=import_record.from_account.attributes.currency_code,
            currency_symbol=import_record.from_account.attributes.currency_symbol,
            destination_name=import_record.to_account.attributes.name,
            destination_type=import_record.to_account.attributes.type,
            foreign_currency_code=import_record.to_account.attributes.currency_code,
            foreign_currency_symbol=import_record.to_account.attributes.currency_symbol,
            foreign_amount=import_record.csv_record.to_amount,
            notes="cryptocom-csv-firefly-iii"
        )
        split.import_hash_v2 = hash_transaction(
            [split.amount, split.date, split.description, split.source_name, split.destination_name],
            split.tags
        )
        list_inner_transactions = []
        list_inner_transactions.append(split)
        new_transaction = firefly_iii_client.Transaction(apply_rules=False, transactions=list_inner_transactions,
                                                         error_if_duplicate_hash=True)

        try:
            if config.debug:
                print('   - Writing a new Crypto.com transaction.')
            transaction_api.store_transaction(new_transaction)
        except ApiException as e:
            if e.status == 422 and "Duplicate of transaction" in e.body:
                print('   - Duplicate Crypto.com transaction detected.')
            else:
                message: str = '   - There was an unknown error writing a new Crypto.com transaction.'
                if config.debug:
                    print(message % e)
                else:
                    print(message)
        except Exception as e:
            message: str = '   - There was an unknown error writing a new Crypto.com transaction.'
            if config.debug:
                print(message % e)
            else:
                print(message)


def get_all_firefly_iii_accounts(account_type: str = "all") -> List[AccountRead]:
    result = []
    with firefly_iii_client.ApiClient(firefly_config) as api_client:
        accounts_api = firefly_iii_client.AccountsApi(api_client)
        page = 0
        page_size = 50  # API default
        load_next = True
        while load_next:
            accounts = accounts_api.list_account(page=page, type=account_type)
            result.extend(accounts.data)
            if len(accounts.data) < page_size:
                load_next = False
            else:
                page += 1
        pass
    return result


def get_relevant_accounts(all_accounts) -> List[AccountRead]:
    result = []
    for account in all_accounts:
        if account.attributes.notes is None:
            continue
        if notes_identifier in account.attributes.notes:
            result.append(account)
    return result


def get_cryptocom_accounts_from_firefly_iii():
    connect()
    all_accounts = []
    all_accounts.extend(get_all_firefly_iii_accounts("asset"))
    all_accounts.extend(get_all_firefly_iii_accounts("revenue"))
    all_accounts.extend(get_all_firefly_iii_accounts("expense"))
    return get_relevant_accounts(all_accounts)
