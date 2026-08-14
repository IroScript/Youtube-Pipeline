"""
==============================================================================
Kaggle Notebook Full Execution Script Template (Chrome Session with Cookies)
ইরাক ভাইয়া, এটি ক্যাগলে সরাসরি রান করার জন্য একটি সম্পূর্ণ স্কিপ্ট টেমপ্লেট।
==============================================================================
"""

import os
import sys
import json
import time

# ১. প্রয়োজনীয় ডিপেন্ডেন্সি ইনস্টল (যদি ক্যাগলে পূর্বাহ্নে ইনস্টল করা না থাকে)
os.system("pip install -q selenium webdriver-manager requests")

import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# ==============================================================================
# কনফিগারেশন
# ==============================================================================
TARGET_URL = "https://example.com/dashboard"
# ক্যাগলে আপনার প্রাইভেট ডেটাসেটের ফাইল পাথ দিন:
COOKIE_FILE_PATH = "/kaggle/input/my-private-cookies/cookies.json" 

# ==============================================================================
# ১. Requests Session (Lightweight API / Scraping-এর জন্য)
# ==============================================================================
def create_requests_session_with_cookies(cookie_path):
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    
    if os.path.exists(cookie_path):
        with open(cookie_path, "r", encoding="utf-8") as f:
            cookies = json.load(f)
        for c in cookies:
            session.cookies.set(c["name"], c["value"], domain=c.get("domain", ""))
        print(f"[✓] Requests session initialized with {len(cookies)} cookies.")
    else:
        print(f"[!] Cookie file not found at: {cookie_path}")
    return session

# ==============================================================================
# ২. Selenium Headless Chrome Driver (Full Web Browser-এর জন্য)
# ==============================================================================
def create_kaggle_chrome_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
    except Exception as e:
        print(f"[!] ChromeDriverManager fallback: {e}")
        chrome_options.binary_location = "/usr/bin/google-chrome"
        driver = webdriver.Chrome(options=chrome_options)
        
    return driver

def load_cookies_to_chrome(driver, target_url, cookie_path):
    driver.get(target_url)
    time.sleep(2)
    
    if not os.path.exists(cookie_path):
        print(f"[!] Warning: Cookie file missing at {cookie_path}")
        return driver

    with open(cookie_path, "r", encoding="utf-8") as f:
        cookies = json.load(f)

    added = 0
    for c in cookies:
        cookie_dict = {"name": c["name"], "value": c["value"]}
        if c.get("domain"):
            cookie_dict["domain"] = c["domain"]
        if c.get("path"):
            cookie_dict["path"] = c["path"]
            
        try:
            driver.add_cookie(cookie_dict)
            added += 1
        except Exception:
            pass

    print(f"[✓] Loaded {added} cookies into Selenium Chrome.")
    driver.get(target_url)
    time.sleep(3)
    return driver

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================
if __name__ == "__main__":
    print("=== Kaggle Session Automation Started ===")
    
    # পদ্ধতি ১: Requests Session টেস্ট
    req_session = create_requests_session_with_cookies(COOKIE_FILE_PATH)
    # res = req_session.get(TARGET_URL)
    # print("Requests Status Code:", res.status_code)

    # পদ্ধতি ২: Selenium Headless Chrome টেস্ট
    driver = create_kaggle_chrome_driver()
    try:
        driver = load_cookies_to_chrome(driver, TARGET_URL, COOKIE_FILE_PATH)
        print("Page Title after cookie login:", driver.title)
        # Screenshot save example (in Kaggle working directory)
        driver.save_screenshot("/kaggle/working/session_result.png")
        print("[✓] Screenshot saved to /kaggle/working/session_result.png")
    finally:
        driver.quit()
        print("=== Execution Complete ===")
