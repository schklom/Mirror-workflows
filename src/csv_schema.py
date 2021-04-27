from datetime import datetime


class RawCryptoComCsvSchema(object):
    def __init__(self, timestamp, transaction_description, currency, amount, to_currency, to_amount, native_currency,
                 native_amount, native_amount_in_usd, transaction_kind):
        self.timestamp: datetime = timestamp
        self.transaction_description: str = transaction_description
        self.currency: str = currency
        self.amount: float = amount
        self.to_currency: str = to_currency
        self.to_amount: float = to_amount
        self.native_currency: str = native_currency
        self.native_amount: float = native_amount
        self.native_amount_in_usd: float = native_amount_in_usd
        self.transaction_kind: str = transaction_kind

    @classmethod
    def get_from_csv_line(cls, csv_line) -> 'RawCryptoComCsvSchema':
        data = csv_line.split(',')
        if not len(data) == 10:
            raise CsvTransformationException
        return RawCryptoComCsvSchema(
            timestamp=datetime.fromisoformat(data[0]),
            transaction_description=data[1],
            currency=data[2],
            amount=float(data[3]),
            to_currency=data[4],
            to_amount=float(data[5]) if not data[5] == "" else None,
            native_currency=data[6],
            native_amount=float(data[7]),
            native_amount_in_usd=float(data[8]),
            transaction_kind=data[9].strip()
        )


class FinalCsvSchema(object):
    pass


class CsvTransformationException(Exception):
    pass
