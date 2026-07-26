import os
import requests

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
stream = False

# সিস্টেম থেকে API Key রিড করবে
api_key = os.getenv("NVIDIA_API_KEY")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "text/event-stream" if stream else "application/json",
}

payload = {
  "model": "minimaxai/minimax-m3",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?" # এখানে আপনার প্রশ্নটি লিখুন
    }
  ],
  "temperature": 1,
  "top_p": 0.95,
  "max_tokens": 8192,
  "stream": stream
}

response = requests.post(invoke_url, headers=headers, json=payload, stream=stream)
if stream:
    for line in response.iter_lines():
        if line:
            print(line.decode("utf-8"))
else:
    print(response.json())