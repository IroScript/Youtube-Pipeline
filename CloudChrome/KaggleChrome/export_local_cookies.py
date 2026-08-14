"""
Local Cookie Exporter / Formatter Script
ইরাক ভাইয়া, এই স্ক্রিপ্টটি আপনার লোকাল ব্রাউজারের কুকিজ ক্যাগলে ব্যবহারের জন্য প্রস্তুত করে।
"""

import json
import os

def format_and_save_cookies(raw_cookies, output_path="cookies.json"):
    """
    raw_cookies: List of dicts exported from Cookie-Editor extension or browser tools.
    Saves sanitized cookies.json for Kaggle Selenium / Requests.
    """
    clean_cookies = []
    
    if isinstance(raw_cookies, str):
        raw_cookies = json.loads(raw_cookies)
        
    for cookie in raw_cookies:
        item = {
            "name": cookie.get("name"),
            "value": cookie.get("value"),
            "domain": cookie.get("domain", ""),
            "path": cookie.get("path", "/"),
            "secure": cookie.get("secure", False),
            "httpOnly": cookie.get("httpOnly", False)
        }
        if "sameSite" in cookie:
            item["sameSite"] = cookie["sameSite"]
        clean_cookies.append(item)
        
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(clean_cookies, f, indent=4, ensure_ascii=False)
        
    print(f"[✓] {len(clean_cookies)} cookies successfully saved to: {output_path}")
    print("[!] Now upload this 'cookies.json' to Kaggle as a PRIVATE Dataset.")

if __name__ == "__main__":
    example_path = os.path.join(os.path.dirname(__file__), "cookies.json")
    print("Local Cookie Utility Ready.")
    print("Usage: Call format_and_save_cookies(cookies_data, output_path)")
