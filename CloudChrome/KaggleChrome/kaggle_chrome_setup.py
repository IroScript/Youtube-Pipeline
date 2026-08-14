"""
Kaggle Chrome Setup & Cookie Loader Utility
ইরাক ভাইয়া, এই স্ক্রিপ্টটি ক্যাগল এনভায়রনমেন্টে Headless Chrome চালু করে এবং প্রাইভেট ডেটাসেট থেকে কুকিজ লোড করে।
"""

import os
import sys
import json
import time
import subprocess

def install_kaggle_dependencies():
    """Kaggle Linux Environment-এ Chrome এবং Selenium ইনস্টল/আপডেট করে"""
    print("[*] Checking & Installing Selenium / Chrome dependencies in Kaggle...")
    try:
        subprocess.run(["pip", "install", "-q", "selenium", "webdriver-manager"], check=True)
        print("[✓] Dependencies installed successfully.")
    except Exception as e:
        print(f"[!] Warning installing dependencies: {e}")

def get_kaggle_chrome_driver(headless=True):
    """Kaggle-এর জন্য কনফিগার করা Selenium Chrome WebDriver রিটার্ন করে"""
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager

    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
    except Exception as err:
        print(f"[!] Standard ChromeDriverManager failed, falling back to system binary: {err}")
        chrome_options.binary_location = "/usr/bin/google-chrome"
        driver = webdriver.Chrome(options=chrome_options)

    print("[✓] Kaggle Chrome Driver initialized successfully.")
    return driver

def load_cookies_into_driver(driver, target_url, cookie_file_path):
    """
    ফাইল থেকে কুকিজ লোড করে Selenium Driver-এ যোগ করে এবং লগইন অবস্থা সক্রিয় করে।
    """
    if not os.path.exists(cookie_file_path):
        raise FileNotFoundError(f"[!] Cookie file not found at: {cookie_file_path}")

    print(f"[*] Navigating to base URL: {target_url}")
    driver.get(target_url)
    time.sleep(2)

    print(f"[*] Loading cookies from: {cookie_file_path}")
    with open(cookie_file_path, "r", encoding="utf-8") as f:
        cookies = json.load(f)

    loaded_count = 0
    for c in cookies:
        cookie_dict = {
            "name": c["name"],
            "value": c["value"]
        }
        if "domain" in c and c["domain"]:
            cookie_dict["domain"] = c["domain"]
        if "path" in c and c["path"]:
            cookie_dict["path"] = c["path"]

        try:
            driver.add_cookie(cookie_dict)
            loaded_count += 1
        except Exception:
            # Domain mismatch attempt handle
            pass

    print(f"[✓] {loaded_count} cookies added to Chrome driver.")
    print("[*] Refreshing page to apply cookies...")
    driver.get(target_url)
    time.sleep(3)
    return driver
