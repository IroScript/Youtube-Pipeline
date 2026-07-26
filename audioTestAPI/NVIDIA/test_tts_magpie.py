"""
NVIDIA NIM — Magpie TTS (Text-to-Speech) Test
================================================
Endpoint:  POST https://integrate.api.nvidia.com/v1/audio/synthesize
Model:     nvidia/magpie-tts-multilingual

Reads API key from sibling .txt file, synthesizes speech, saves as .wav.

Usage:
  python test_tts_magpie.py
"""
import os
import re
import requests
import struct
import sys

# ──────────────────────── কনফিগারেশন ────────────────────────
SYNTHESIZE_URL = "https://integrate.api.nvidia.com/v1/audio/synthesize"
LIST_VOICES_URL = "https://integrate.api.nvidia.com/v1/audio/list_voices"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "tts_output")
SAMPLE_RATE = 44100
KEY_FILE = os.path.join(os.path.dirname(__file__), "NVIDIA NIM API KEY.txt")


def load_first_key() -> str | None:
    """Read the first nvapi-... key from the sibling .txt file."""
    with open(KEY_FILE, "r", encoding="utf-8") as fh:
        m = re.search(r"nvapi-[A-Za-z0-9_\-]+", fh.read())
        return m.group(0) if m else None


def get_api_key() -> str:
    key = os.getenv("NVIDIA_API_KEY") or load_first_key()
    if not key:
        raise SystemExit("❌ API key পাওয়া যায়নি। NVIDIA_API_KEY সেট করুন অথবা .txt ফাইলে যোগ করুন।")
    return key


def list_voices(api_key: str) -> list:
    """Available voice তালিকা দেখুন।"""
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        r = requests.get(LIST_VOICES_URL, headers=headers, timeout=30)
        if r.status_code == 200:
            return r.json() if isinstance(r.json(), list) else r.json().get("voices", [])
        print(f"⚠️  Voice list: HTTP {r.status_code} — {r.text[:200]}")
        return []
    except Exception as exc:
        print(f"⚠️  Voice list error: {exc}")
        return []


def write_wav(filepath: str, pcm_bytes: bytes, sample_rate: int = 44100,
              num_channels: int = 1, bits_per_sample: int = 16):
    """Raw PCM bytes থেকে WAV ফাইল তৈরি করে।"""
    byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
    block_align = num_channels * (bits_per_sample // 8)
    data_size = len(pcm_bytes)
    with open(filepath, "wb") as f:
        # RIFF header
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVE")
        # fmt chunk
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))
        f.write(struct.pack("<HHIIHH", 1, num_channels, sample_rate,
                            byte_rate, block_align, bits_per_sample))
        # data chunk
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        f.write(pcm_bytes)


def synthesize(api_key: str, text: str, voice: str = "Magpie-Multilingual.EN-US.Aria",
               language: str = "en-US") -> tuple[bool, str]:
    """TTS synthesis — returns (success, message)."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "audio/wav",
    }
    data = {
        "text": text,
        "language": language,
        "voice": voice,
        "encoding": "LINEAR_PCM",
        "sample_rate_hz": str(SAMPLE_RATE),
    }
    try:
        r = requests.post(SYNTHESIZE_URL, headers=headers, data=data, timeout=120)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:200]}"

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        # ফাইলনেম তৈরি
        safe_voice = voice.replace(".", "_").replace(" ", "_")[:30]
        outfile = os.path.join(OUTPUT_DIR, f"tts_{safe_voice}.wav")

        content_type = r.headers.get("Content-Type", "")
        if "wav" in content_type or r.content[:4] == b"RIFF":
            # সরাসরি WAV ফাইল পেয়েছি
            with open(outfile, "wb") as f:
                f.write(r.content)
        else:
            # Raw PCM — নিজে WAV বানাতে হবে
            write_wav(outfile, r.content, SAMPLE_RATE)

        size_kb = os.path.getsize(outfile) / 1024
        return True, f"saved {outfile} ({size_kb:.1f} KB)"
    except Exception as exc:
        return False, f"exception: {exc}"


def main():
    api_key = get_api_key()
    print(f"🔑 API key prefix: {api_key[:14]}...")
    print("=" * 60)

    # ১. Voice তালিকা
    print("\n📋 Available voices (list_voices endpoint):")
    voices = list_voices(api_key)
    if voices:
        for v in voices[:10]:
            if isinstance(v, dict):
                print(f"   • {v.get('name', v)}")
            else:
                print(f"   • {v}")
        if len(voices) > 10:
            print(f"   ... এবং আরো {len(voices) - 10} টি")
    else:
        print("   (voice তালিকা পাওয়া যায়নি — ডিফল্ট ব্যবহার করা হবে)")

    # ২. বিভিন্ন ভয়েস দিয়ে TTS টেস্ট
    test_cases = [
        ("Magpie-Multilingual.EN-US.Aria", "en-US",
         "Hello! This is a test of NVIDIA's Magpie text-to-speech model. The audio quality should be natural and expressive."),
        ("Magpie-Multilingual.EN-US.James", "en-US",
         "Welcome to NVIDIA NIM. This voice synthesis is powered by deep learning and GPU acceleration."),
        ("Magpie-Multilingual.DE-DE.Nils", "de-DE",
         "Hallo! Dies ist ein Test des NVIDIA Magpie Text-zu-Sprache Modells."),
    ]

    print("\n🔊 TTS Synthesis Tests:")
    print("-" * 60)
    for voice, lang, text in test_cases:
        print(f"\n  Voice: {voice} | Lang: {lang}")
        print(f"  Text:  \"{text[:60]}...\"")
        ok, msg = synthesize(api_key, text, voice, lang)
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  Result: {status} — {msg}")

    print("\n" + "=" * 60)
    print("🏁 TTS test সম্পন্ন!")


if __name__ == "__main__":
    main()
