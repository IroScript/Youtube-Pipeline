"""
NVIDIA NIM — Parakeet ASR (Automatic Speech Recognition) Test
================================================================
Endpoint:  POST https://integrate.api.nvidia.com/v1/audio/transcriptions
Models:    nvidia/parakeet-ctc-1.1b-asr
           nvidia/parakeet-ctc-0.6b-asr
           nvidia/parakeet-tdt-0.6b-v2

Reads API key from sibling .txt file.
If no test audio exists, generates a short sine-wave WAV for testing.

Usage:
  python test_asr_parakeet.py
  python test_asr_parakeet.py path/to/audio.wav
"""
import os
import re
import sys
import math
import struct
import requests

# ──────────────────────── কনফিগারেশন ────────────────────────
TRANSCRIPTION_URL = "https://integrate.api.nvidia.com/v1/audio/transcriptions"
KEY_FILE = os.path.join(os.path.dirname(__file__), "NVIDIA NIM API KEY.txt")
TEST_AUDIO_DIR = os.path.join(os.path.dirname(__file__), "asr_test_audio")

# টেস্ট করার মডেলগুলো
ASR_MODELS = [
    "nvidia/parakeet-ctc-1.1b-asr",
    "nvidia/parakeet-ctc-0.6b-asr",
    "nvidia/parakeet-tdt-0.6b-v2",
]


def load_first_key() -> str | None:
    with open(KEY_FILE, "r", encoding="utf-8") as fh:
        m = re.search(r"nvapi-[A-Za-z0-9_\-]+", fh.read())
        return m.group(0) if m else None


def get_api_key() -> str:
    key = os.getenv("NVIDIA_API_KEY") or load_first_key()
    if not key:
        raise SystemExit("❌ API key পাওয়া যায়নি।")
    return key


def generate_test_wav(filepath: str, duration_sec: float = 3.0,
                      sample_rate: int = 16000, freq: float = 440.0):
    """টেস্টিং-এর জন্য একটি সিনথেটিক sine-wave WAV ফাইল তৈরি করে।"""
    num_samples = int(sample_rate * duration_sec)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        # Fade in/out
        envelope = 1.0
        fade = int(0.1 * sample_rate)
        if i < fade:
            envelope = i / fade
        elif i > num_samples - fade:
            envelope = (num_samples - i) / fade
        val = int(envelope * 16000 * math.sin(2.0 * math.pi * freq * t))
        val = max(-32768, min(32767, val))
        samples.append(val)

    # WAV ফাইল লিখি
    data_bytes = struct.pack(f"<{len(samples)}h", *samples)
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
    block_align = num_channels * (bits_per_sample // 8)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + len(data_bytes)))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))
        f.write(struct.pack("<HHIIHH", 1, num_channels, sample_rate,
                            byte_rate, block_align, bits_per_sample))
        f.write(b"data")
        f.write(struct.pack("<I", len(data_bytes)))
        f.write(data_bytes)
    return filepath


def transcribe(api_key: str, audio_path: str, model: str,
               language: str = "en-US") -> tuple[bool, str]:
    """ASR transcription — returns (success, transcription_or_error)."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    try:
        with open(audio_path, "rb") as f:
            files = {
                "file": (os.path.basename(audio_path), f, "audio/wav"),
            }
            data = {
                "model": model,
                "language": language,
                "response_format": "json",
            }
            r = requests.post(TRANSCRIPTION_URL, headers=headers,
                              files=files, data=data, timeout=120)

        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:200]}"

        result = r.json()
        text = result.get("text", result.get("transcript", str(result)))
        return True, text[:200]
    except Exception as exc:
        return False, f"exception: {exc}"


def main():
    api_key = get_api_key()
    print(f"🔑 API key prefix: {api_key[:14]}...")
    print("=" * 70)

    # অডিও ফাইল ঠিক করি
    if len(sys.argv) > 1 and os.path.isfile(sys.argv[1]):
        audio_path = sys.argv[1]
        print(f"📁 User-provided audio: {audio_path}")
    else:
        audio_path = os.path.join(TEST_AUDIO_DIR, "test_tone_440hz.wav")
        if not os.path.exists(audio_path):
            print("🔧 টেস্ট অডিও তৈরি করছি (440 Hz sine wave, 3 sec)...")
            generate_test_wav(audio_path)
        print(f"📁 Test audio: {audio_path}")
        size_kb = os.path.getsize(audio_path) / 1024
        print(f"   Size: {size_kb:.1f} KB")

    # প্রতিটি ASR মডেল টেস্ট করি
    print(f"\n🎤 ASR Transcription Tests ({len(ASR_MODELS)} models):")
    print("-" * 70)
    results = []
    for model in ASR_MODELS:
        print(f"\n  Model: {model}")
        ok, msg = transcribe(api_key, audio_path, model)
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  Result: {status}")
        print(f"  Output: {msg}")
        results.append((model, ok, msg))

    # সামারি
    print("\n" + "=" * 70)
    print("📊 ASR Test Summary:")
    print(f"{'Model':<40} {'Status':<8}")
    print("-" * 50)
    for model, ok, _ in results:
        print(f"{model:<40} {'PASS' if ok else 'FAIL':<8}")
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n🏁 {passed}/{len(results)} মডেল সফলভাবে কাজ করেছে।")


if __name__ == "__main__":
    main()
