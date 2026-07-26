import os
import re
import requests

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
stream = False

# API key env থেকে নাও, না পেলে .txt ফাইল থেকে
api_key = os.getenv("NVIDIA_API_KEY")
if not api_key:
    txt_path = os.path.join(os.path.dirname(__file__), "NVIDIA NIM API KEY.txt")
    with open(txt_path, "r", encoding="utf-8") as fh:
        match = re.search(r"nvapi-[A-Za-z0-9_\-]+", fh.read())
        if match:
            api_key = match.group(0)

headers = {
    "Authorization": f"Bearer {api_key}",  # সঠিকভাবে env value বসানো হচ্ছে
    "Accept": "text/event-stream" if stream else "application/json",
}

payload = {
    "model": "minimaxai/minimax-m3",
    "messages": [
        {
            "role": "user",
            "content": "generate a 300 words prompt for veo 3.1"   # খালি ছিল, একটা প্রশ্ন দিলাম
        }
    ],
    "temperature": 1,
    "top_p": 0.95,
    "max_tokens": 8192,
    "stream": stream
}

response = requests.post(invoke_url, headers=headers, json=payload, stream=stream, timeout=180)
if stream:
    for line in response.iter_lines():
        if line:
            print(line.decode("utf-8"))
else:
    print(response.json())
