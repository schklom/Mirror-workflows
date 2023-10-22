#!/usr/bin/python3

import os
from selenium import webdriver

CI_COMMIT_SHORT_SHA = os.getenv("CI_COMMIT_SHORT_SHA")

if not CI_COMMIT_SHORT_SHA:
    print("CI_COMMIT_SHORT_SHA env var should be defined")
    exit(1)

options = webdriver.ChromeOptions()

driver = webdriver.Remote(
    command_executor='http://selenium-hub.selenium-grid.svc.cluster.local:4444/wd/hub',
	options=options
)

app_url = f"http://tt-rss-{CI_COMMIT_SHORT_SHA}-app.gitlab-fakecake.svc.cluster.local/tt-rss"

print(f"base url = {app_url}")

driver.get(app_url)
print(driver.page_source)
driver.quit()
