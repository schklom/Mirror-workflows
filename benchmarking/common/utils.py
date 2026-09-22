import base64


def b64(data: str) -> str:
    return base64.b64encode(data.encode()).decode('UTF-8')
