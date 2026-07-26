"""
Bulk key tester — reads every `Label: nvapi-...` line from the .txt file
and runs BOTH APIs against EACH key. Prints a clean PASS/FAIL table.

Usage:
  python bulk_key_tester.py

Add new keys to "NVIDIA NIM API KEY.txt", one per line, then rerun.
"""
import os
import re
import json
import requests

INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = "meta/llama-3.1-8b-instruct"
KEY_FILE = os.path.join(os.path.dirname(__file__), "NVIDIA NIM API KEY.txt")


def load_all_keys():
    """Return list of (label, key) tuples from the .txt file."""
    with open(KEY_FILE, "r", encoding="utf-8") as fh:
        items = []
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or ":" not in line:
                continue
            label, _, rest = line.partition(":")
            m = re.search(r"nvapi-[A-Za-z0-9_\-]+", rest)
            if m:
                items.append((label.strip(), m.group(0)))
        return items


def hit(url, headers, payload, timeout=120):
    return requests.post(url, headers=headers, json=payload,
                         stream=payload.get("stream", False), timeout=timeout)


def test_api1(api_key):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": "say OK"}],
        "max_tokens": 8,
        "stream": False,
    }
    try:
        r = hit(INVOKE_URL, headers, payload)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        reply = r.json()["choices"][0]["message"]["content"]
        return True, reply[:40]
    except Exception as exc:
        return False, f"err:{type(exc).__name__}"


def test_api2(api_key):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": "say OK"}],
        "max_tokens": 8,
        "stream": True,
    }
    try:
        r = hit(INVOKE_URL, headers, payload)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        seen_done = False
        for raw in r.iter_lines():
            if not raw:
                continue
            line = raw.decode("utf-8")
            if not line.startswith("data:"):
                continue
            body = line[5:].strip()
            if body == "[DONE]":
                seen_done = True
                break
        return (True, "streamed+DONE") if seen_done else (False, "no [DONE]")
    except Exception as exc:
        return False, f"err:{type(exc).__name__}"


def main():
    keys = load_all_keys()
    if not keys:
        print("No keys found in NVIDIA NIM API KEY.txt")
        return
    print(f"Found {len(keys)} key(s) in {os.path.basename(KEY_FILE)}\n")
    print(f"{'#':<3} {'Label':<14} {'Key prefix':<14}  {'API1':<6} {'API2':<6}  Notes")
    print("-" * 78)
    for i, (label, key) in enumerate(keys, 1):
        a1_ok, a1_msg = test_api1(key)
        a2_ok, a2_msg = test_api2(key)
        print(f"{i:<3} {label:<14} {key[:12]+'...':<14}  "
              f"{'PASS' if a1_ok else 'FAIL':<6} {'PASS' if a2_ok else 'FAIL':<6}  "
              f"a1={a1_msg} | a2={a2_msg}")
    print("-" * 78)


if __name__ == "__main__":
    main()
