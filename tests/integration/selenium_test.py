#!/usr/bin/python3

import os
import traceback
import time

from selenium import webdriver
from selenium.webdriver.common.by import By

CI_COMMIT_SHORT_SHA = os.getenv("CI_COMMIT_SHORT_SHA")
SELENIUM_GRID_ENDPOINT = os.getenv("SELENIUM_GRID_ENDPOINT")

if not CI_COMMIT_SHORT_SHA or not SELENIUM_GRID_ENDPOINT:
    print("both CI_COMMIT_SHORT_SHA snd SELENIUM_GRID_ENDPOINT env vars should be defined")
    exit(1)

driver = webdriver.Remote(command_executor=SELENIUM_GRID_ENDPOINT, options=webdriver.ChromeOptions())

app_url = f"http://tt-rss-{CI_COMMIT_SHORT_SHA}-app.gitlab-fakecake.svc.cluster.local/tt-rss"

print(f"requesting base url: {app_url}")

try:
    driver.get(app_url)

    print("filling in login information...")

    for name in ["login", "password"]:
        field = driver.find_element(by=By.CSS_SELECTOR, value=f"input[name='{name}']")
        field.clear()
        field.send_keys("test")

    print("logging in...")

    login_button = driver.find_element(by=By.CSS_SELECTOR, value="#dijit_form_Button_0_label")
    login_button.click()

    print("checking for feedTree...")

    assert driver.find_element(by=By.CSS_SELECTOR, value="#feedTree")

    print("all done.")

except Exception:
    traceback.print_exc()
finally:
    driver.quit()
