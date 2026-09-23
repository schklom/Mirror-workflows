import uuid
from time import time

from common.utils import b64
from locust import HttpUser, task

URL_API = "/api/v2"
URL_REGISTER = URL_API + "/account/register"
URL_LOGIN = URL_API + "/account/login"
URL_LOCATION = URL_API + "/data/location"
URL_PICTURE = URL_API + "/data/picture"


class FMD(HttpUser):
    # Register the user on FMD-Server
    def on_start(self):
        self.username = uuid.uuid7().hex
        self.salt = b64("salt")
        self.pw = b64("pw" + self.username)
        self.key = b64("key" + self.username)

        register_request = {
            "username": self.username,
            "salt64": self.salt,
            "passwordHash64": self.pw,
            "protoVersion": 2,
            "encMasterKey64": self.key,
            "registrationToken": "",
        }
        self.client.post(URL_REGISTER, json=register_request)

    def get_access_token(self) -> str | None:
        login_request = {
            "username": self.username,
            "passwordHash64": self.pw,
            "sessionDurationSeconds": 60,
        }
        response = self.client.post(URL_LOGIN, json=login_request)
        data = response.json()
        if "accessToken" in data:
            return data["accessToken"]
        return None

    def post_data(self, url, data):
        token = self.get_access_token()
        if token:
            item = {
                "items": [
                    {
                        "clientItemIdHex": uuid.uuid7().hex,
                        "unixMillis": int(time() * 1000),
                        "ciphertext64": b64(data),
                    }
                ]
            }
            self.client.post(
                url, json=item, headers={"Authorization": "Bearer " + token}
            )

    def get_data(self, url):
        token = self.get_access_token()
        if token:
            self.client.get(url, headers={"Authorization": "Bearer " + token})

    @task
    def post_location(self):
        self.post_data(URL_LOCATION, "dummy_location")

    @task
    def post_picture(self):
        self.post_data(URL_PICTURE, "dummy_picture")

    @task
    def get_locations(self):
        self.get_data(URL_LOCATION)

    @task
    def get_pictures(self):
        self.get_data(URL_PICTURE)
