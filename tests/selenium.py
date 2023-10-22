#!/usr/bin/python3

from selenium import webdriver

options = webdriver.ChromeOptions()

driver = webdriver.Remote(
	command_executor='http://selenium-hub.selenium-grid.svc.cluster.local/wd/hub',
	options=options
)

driver.get("http://tt-rss-latest-app.gitlab-fakecake.svc.cluster.local/tt-rss")
print(driver.page_source)
driver.quit()

