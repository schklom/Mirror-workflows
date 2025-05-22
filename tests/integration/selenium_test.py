#!/usr/bin/python3

import os
import unittest
import xmlrunner

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class SeleniumTest(unittest.TestCase):
    def setUp(self):
        CI_COMMIT_SHORT_SHA = os.getenv("CI_COMMIT_SHORT_SHA")
        SELENIUM_GRID_ENDPOINT = os.getenv("SELENIUM_GRID_ENDPOINT")
        K8S_NAMESPACE = os.getenv("K8S_NAMESPACE")

        self.driver = webdriver.Remote(command_executor=SELENIUM_GRID_ENDPOINT, options=webdriver.ChromeOptions())
        self.base_url = f"http://tt-rss-{CI_COMMIT_SHORT_SHA}-app.{K8S_NAMESPACE}.svc.cluster.local/tt-rss"

        self.driver.set_page_load_timeout(10)

    def tearDown(self):
        self.driver.quit()

    def test_login(self):
        self.driver.get(self.base_url)

        assert self.driver.find_element(by=By.CSS_SELECTOR, value="body.ttrss_login")

        for name in ["login", "password"]:
            field = self.driver.find_element(by=By.CSS_SELECTOR, value=f"input[name='{name}']")
            field.clear()
            field.send_keys("test")

        login_button = self.driver.find_element(by=By.CSS_SELECTOR, value="#dijit_form_Button_0_label")
        login_button.click()

    def test_index(self):
        self.test_login()

        assert self.driver.find_element(by=By.CSS_SELECTOR, value="body.ttrss_main")

        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#feedTree")))

        assert self.driver.find_element(by=By.CSS_SELECTOR, value="#feedTree").is_displayed()

        self.driver.execute_script("Feeds.open({feed:-4})")

        assert self.driver.find_element(by=By.CSS_SELECTOR, value="#headlines-frame").is_displayed()

        self.driver.execute_script("Filters.edit()")

        assert self.driver.find_element(by=By.CSS_SELECTOR, value="#filterEditDlg").is_displayed()

    def test_prefs(self):
        self.test_login()

        self.driver.get(self.base_url + "/prefs.php")

        assert self.driver.find_element(by=By.CSS_SELECTOR, value="body.ttrss_prefs")

        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#dijit_layout_AccordionPane_1_wrapper")))

        assert self.driver.find_element(by=By.CSS_SELECTOR, value="#dijit_layout_AccordionPane_1_wrapper").is_displayed()

        self.driver.execute_script("dijit.byId('pref-tabs').selectChild('feedsTab')")

        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#feedTree")))

        assert self.driver.find_element(by=By.CSS_SELECTOR, value="#feedTree").is_displayed()

with open('selenium-report.xml', 'wb') as output:
    unittest.main(testRunner=xmlrunner.XMLTestRunner(output=output), failfast=False, buffer=False, catchbreak=False)
