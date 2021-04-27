from firefly_iii_client import AccountRead

from csv_schema import RawCryptoComCsvSchema


class ImportRecord(object):
    def __init__(self, from_account: AccountRead, to_account: AccountRead, csv_record: RawCryptoComCsvSchema):
        self.from_account = from_account
        self.to_account = to_account
        self.csv_record = csv_record
