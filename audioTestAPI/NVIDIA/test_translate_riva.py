"""
NVIDIA NIM — Riva Translation Test
=====================================
Endpoint:  POST https://integrate.api.nvidia.com/v1/chat/completions
Model:     nvidia/riva-translate-4b-instruct-v1_1

This model uses the OpenAI-compatible chat API for translation.
Supports 12 languages including: en, de, fr, es, pt, zh, ja, ko, ru, ar, hi, it

Usage:
  python test_translate_riva.py
"""
import os
import re
import json
import requests

# ──────────────────────── কনফিগারেশন ────────────────────────
INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = "nvidia/riva-translate-4b-instruct-v1_1"
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


def translate(api_key: str, text: str, source_lang: str,
              target_lang: str, stream: bool = False) -> tuple[bool, str]:
    """Translate text using Riva NMT — returns (success, translation_or_error)."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "text/event-stream" if stream else "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": f"You are a professional translator. Translate the user's input from {source_lang} to {target_lang}. Output ONLY the translation, nothing else."
            },
            {
                "role": "user",
                "content": text
            }
        ],
        "temperature": 0.2,
        "top_p": 0.7,
        "max_tokens": 1024,
        "stream": stream,
    }
    try:
        r = requests.post(INVOKE_URL, headers=headers, json=payload,
                          stream=stream, timeout=120)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:200]}"

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
            reply = r.json()["choices"][0]["message"]["content"]
            return True, reply
    except Exception as exc:
        return False, f"exception: {exc}"


def main():
    api_key = get_api_key()
    print(f"🔑 API key prefix: {api_key[:14]}...")
    print(f"🤖 Model: {MODEL}")
    print("=" * 70)

    # অনুবাদ টেস্ট কেস
    test_cases = [
        # (source_text, source_lang, target_lang, description)
        ("Machine learning models require GPU acceleration for optimal performance.",
         "English", "German", "EN → DE"),
        ("Machine learning models require GPU acceleration for optimal performance.",
         "English", "French", "EN → FR"),
        ("Machine learning models require GPU acceleration for optimal performance.",
         "English", "Spanish", "EN → ES"),
        ("Machine learning models require GPU acceleration for optimal performance.",
         "English", "Japanese", "EN → JA"),
        ("Machine learning models require GPU acceleration for optimal performance.",
         "English", "Chinese", "EN → ZH"),
        ("Machine learning models require GPU acceleration for optimal performance.",
         "English", "Korean", "EN → KO"),
        ("Machine learning models require GPU acceleration for optimal performance.",
         "English", "Bengali", "EN → BN"),
        ("Künstliche Intelligenz verändert die Welt.",
         "German", "English", "DE → EN"),
    ]

    print(f"\n🌍 Translation Tests ({len(test_cases)} pairs):")
    print("-" * 70)
    results = []

    for text, src, tgt, desc in test_cases:
        print(f"\n  [{desc}] {src} → {tgt}")
        print(f"  Input:  \"{text[:60]}{'...' if len(text) > 60 else ''}\"")

        # Non-stream test
        ok, translation = translate(api_key, text, src, tgt, stream=False)
        status = "✅" if ok else "❌"
        print(f"  Output: {status} \"{translation[:80]}{'...' if len(translation) > 80 else ''}\"")
        results.append((desc, ok, translation))

    # সামারি
    print("\n" + "=" * 70)
    print("📊 Translation Test Summary:")
    print(f"{'Pair':<12} {'Status':<8} {'Translation':<50}")
    print("-" * 70)
    for desc, ok, trans in results:
        print(f"{desc:<12} {'PASS' if ok else 'FAIL':<8} {trans[:50]}")
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n🏁 {passed}/{len(results)} অনুবাদ সফল।")

    # Stream mode test
    print("\n\n🔄 Streaming Translation Test (EN → DE):")
    print("-" * 70)
    ok, streamed = translate(
        api_key,
        "NVIDIA GPUs power the world's most advanced AI systems.",
        "English", "German", stream=True
    )
    print(f"  {'✅ PASS' if ok else '❌ FAIL'}: {streamed}")


if __name__ == "__main__":
    main()
