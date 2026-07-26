"""
NVIDIA NIM — Nemotron Voicechat (Speech-to-Speech) Test
=========================================================
Endpoint:  POST https://integrate.api.nvidia.com/v1/chat/completions
Model:     nvidia/nemotron-voicechat

This model is a Speech-to-Speech (S2S) endpoint.
For the cloud API, we test via the chat completions interface.

Usage:
  python test_voicechat_nemotron.py
"""
import os
import re
import json
import requests

# ──────────────────────── কনফিগারেশন ────────────────────────
INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = "nvidia/nemotron-voicechat"
KEY_FILE = os.path.join(os.path.dirname(__file__), "NVIDIA NIM API KEY.txt")


def load_first_key() -> str | None:
    with open(KEY_FILE, "r", encoding="utf-8") as fh:
        m = re.search(r"nvapi-[A-Za-z0-9_\-]+", fh.read())
        return m.group(0) if m else None


def get_api_key() -> str:
    key = os.getenv("NVIDIA_API_KEY") or load_first_key()
    if not key:
        raise SystemExit("❌ API key পাওয়া যায়নি।")
    return key


def test_voicechat_text(api_key: str, text: str,
                        stream: bool = False) -> tuple[bool, str]:
    """
    Nemotron Voicechat টেস্ট।
    দ্রষ্টব্য: S2S মডেল cloud-এ সীমিত হতে পারে।
    chat completions interface দিয়ে text-based টেস্ট করি।
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "text/event-stream" if stream else "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": text}
        ],
        "temperature": 0.7,
        "top_p": 0.9,
        "max_tokens": 256,
        "stream": stream,
    }
    try:
        r = requests.post(INVOKE_URL, headers=headers, json=payload,
                          stream=stream, timeout=120)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:300]}"

        if stream:
            full = []
            for raw in r.iter_lines():
                if not raw:
                    continue
                line = raw.decode("utf-8")
                if not line.startswith("data:"):
                    continue
                body = line[5:].strip()
                if body == "[DONE]":
                    break
                evt = json.loads(body)
                delta = (evt.get("choices") or [{}])[0].get("delta", {}).get("content")
                if delta:
                    full.append(delta)
            return True, "".join(full)
        else:
            data = r.json()
            reply = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return True, f"{reply[:200]} | tokens: {usage}"
    except Exception as exc:
        return False, f"exception: {exc}"


def main():
    api_key = get_api_key()
    print(f"🔑 API key prefix: {api_key[:14]}...")
    print(f"🤖 Model: {MODEL}")
    print("=" * 70)

    test_prompts = [
        "Hello! Can you hear me? Please respond in a friendly way.",
        "What is the weather like today?",
        "Tell me a fun fact about NVIDIA GPUs.",
    ]

    print(f"\n🗣️ Voicechat Tests ({len(test_prompts)} prompts):")
    print("-" * 70)
    results = []

    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n  Test {i}: \"{prompt}\"")

        # Non-stream
        ok, msg = test_voicechat_text(api_key, prompt, stream=False)
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  Non-stream: {status}")
        print(f"    {msg[:120]}{'...' if len(msg) > 120 else ''}")
        results.append((f"Test {i} (non-stream)", ok))

        # Stream
        ok_s, msg_s = test_voicechat_text(api_key, prompt, stream=True)
        status_s = "✅ PASS" if ok_s else "❌ FAIL"
        print(f"  Stream:     {status_s}")
        print(f"    {msg_s[:120]}{'...' if len(msg_s) > 120 else ''}")
        results.append((f"Test {i} (stream)", ok_s))

    # সামারি
    print("\n" + "=" * 70)
    print("📊 Voicechat Test Summary:")
    print(f"{'Test':<25} {'Status':<8}")
    print("-" * 35)
    for name, ok in results:
        print(f"{name:<25} {'PASS' if ok else 'FAIL'}")
    passed = sum(1 for _, ok in results if ok)
    print(f"\n🏁 {passed}/{len(results)} টেস্ট সফল।")
    print("\n💡 দ্রষ্টব্য: সম্পূর্ণ S2S (audio-in / audio-out) এর জন্য")
    print("   gRPC/WebSocket API ব্যবহার করতে হবে (self-hosted NIM)।")


if __name__ == "__main__":
    main()
