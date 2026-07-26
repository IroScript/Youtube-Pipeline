"""
Test API 1: NVIDIA NIM Chat Completions (NON-STREAMING)
Endpoint: POST https://integrate.api.nvidia.com/v1/chat/completions
Per docs: stream=false returns the full response as a single JSON object.
"""
import os
import re
import requests

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
api_key = os.getenv("NVIDIA_API_KEY")

# Fallback: read any "nvapi-..." key from the sibling .txt file
if not api_key:
    txt_path = os.path.join(os.path.dirname(__file__), "NVIDIA NIM API KEY.txt")
    with open(txt_path, "r", encoding="utf-8") as fh:
        match = re.search(r"nvapi-[A-Za-z0-9_\-]+", fh.read())
        if match:
            api_key = match.group(0)

if not api_key:
    raise SystemExit("No API key found. Set NVIDIA_API_KEY or add it to NVIDIA NIM API KEY.txt")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

payload = {
    "model": "meta/llama-3.1-8b-instruct",
    "messages": [
        {"role": "user", "content": "Say 'API 1 non-stream OK' and nothing else."}
    ],
    "temperature": 0.2,
    "top_p": 0.7,
    "max_tokens": 64,
    "stream": False,
}

print("[Test 1] Non-streaming chat completion -> meta/llama-3.3-70b-instruct")
response = requests.post(invoke_url, headers=headers, json=payload, timeout=180)
print(f"HTTP {response.status_code}")
try:
    data = response.json()
    msg = data["choices"][0]["message"]["content"]
    print("Reply:", msg)
    print("Usage:", data.get("usage"))
except Exception as exc:
    print("Error parsing JSON:", exc)
    print(response.text[:500])
