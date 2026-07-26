"""
Key tester for: Alco Store
Tests both NVIDIA NIM APIs:
  - API 1: POST /v1/chat/completions  (stream=False, JSON)
  - API 2: POST /v1/chat/completions  (stream=True,  SSE)
"""
import os
import re
import json
import requests

INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
TARGET_LABEL = "Alco Store"
MODEL = "meta/llama-3.1-8b-instruct"


def load_key_for(label: str) -> str | None:
    txt_path = os.path.join(os.path.dirname(__file__), "NVIDIA NIM API KEY.txt")
    with open(txt_path, "r", encoding="utf-8") as fh:
        for line in fh:
            if line.lstrip().startswith("#") or ":" not in line:
                continue
            if line.split(":", 1)[0].strip() == label:
                m = re.search(r"nvapi-[A-Za-z0-9_\-]+", line)
                if m:
                    return m.group(0)
    return None


def test_non_stream(api_key: str) -> tuple[bool, str]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": "Reply with exactly: API1_OK"}],
        "temperature": 0.2,
        "top_p": 0.7,
        "max_tokens": 16,
        "stream": False,
    }
    try:
        r = requests.post(INVOKE_URL, headers=headers, json=payload, timeout=120)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:160]}"
        reply = r.json()["choices"][0]["message"]["content"]
        return True, f'reply="{reply}"'
    except Exception as exc:
        return False, f"exception: {exc}"


def test_stream(api_key: str) -> tuple[bool, str]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": "Reply with exactly: API2_OK"}],
        "temperature": 0.2,
        "top_p": 0.7,
        "max_tokens": 16,
        "stream": True,
    }
    try:
        r = requests.post(INVOKE_URL, headers=headers, json=payload,
                          stream=True, timeout=120)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:160]}"
        chunks, done, full = [], False, []
        for raw in r.iter_lines():
            if not raw:
                continue
            line = raw.decode("utf-8")
            if not line.startswith("data:"):
                continue
            body = line[5:].strip()
            if body == "[DONE]":
                done = True
                break
            evt = json.loads(body)
            choices = evt.get("choices") or [{}]
            delta = choices[0].get("delta", {}).get("content")
            if delta:
                full.append(delta)
                chunks.append(1)
        if not done:
            return False, "stream ended without 'data: [DONE]'"
        return True, f"events={len(chunks)} reply=\"{''.join(full)}\""
    except Exception as exc:
        return False, f"exception: {exc}"


def main() -> None:
    api_key = os.getenv("NVIDIA_API_KEY") or load_key_for(TARGET_LABEL)
    print(f"=== Tester for key label: {TARGET_LABEL} ===")
    if not api_key:
        print(f"FAIL  could not load key for '{TARGET_LABEL}' from .txt")
        return
    print(f"key prefix: {api_key[:14]}...")

    ok1, info1 = test_non_stream(api_key)
    print(f"API 1 (non-stream): {'PASS' if ok1 else 'FAIL'}  {info1}")

    ok2, info2 = test_stream(api_key)
    print(f"API 2 (stream):     {'PASS' if ok2 else 'FAIL'}  {info2}")

    print(f"--- summary for {TARGET_LABEL} ---")
    print(f"API 1: {'PASS' if ok1 else 'FAIL'}")
    print(f"API 2: {'PASS' if ok2 else 'FAIL'}")


if __name__ == "__main__":
    main()
