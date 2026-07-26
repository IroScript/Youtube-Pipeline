"""
Test API 2: NVIDIA NIM Chat Completions (STREAMING / SSE)
Endpoint: POST https://integrate.api.nvidia.com/v1/chat/completions
Per docs: stream=true returns Server-Sent Events terminated by 'data: [DONE]'.
Accept header should be 'text/event-stream'.
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
    "Accept": "text/event-stream",
    "Content-Type": "application/json",
}

payload = {
    "model": "meta/llama-3.1-8b-instruct",
    "messages": [
        {"role": "user", "content": "Stream a short 2-sentence haiku about GPUs."}
    ],
    "temperature": 0.7,
    "top_p": 0.9,
    "max_tokens": 128,
    "stream": True,
}

print("[Test 2] Streaming chat completion -> meta/llama-3.3-70b-instruct")
response = requests.post(
    invoke_url, headers=headers, json=payload, stream=True, timeout=180
)
print(f"HTTP {response.status_code}")

full_text = []
event_count = 0
for raw in response.iter_lines():
    if not raw:
        continue
    line = raw.decode("utf-8")
    if not line.startswith("data:"):
        # show any non-data line for debugging
        print("[non-data]", line)
        continue
    payload_part = line[len("data:"):].strip()
    if payload_part == "[DONE]":
        print("[event] data: [DONE]")
        break
    try:
        import json
        evt = json.loads(payload_part)
        event_count += 1
        choices = evt.get("choices") or [{}]
        delta = choices[0].get("delta", {}).get("content")
        if delta:
            full_text.append(delta)
            print(delta, end="", flush=True)
    except Exception as exc:
        print(f"\n[parse-error] {exc}: {payload_part[:120]}")

print("\n--- summary ---")
print(f"events received: {event_count}")
print("assembled reply:", "".join(full_text))
