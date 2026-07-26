"""
NVIDIA NIM — Master Speech Model Tester (v2 — Fixed Endpoints)
================================================================
সকল NVIDIA NIM Speech মডেল টেস্ট করে:

1. Chat LLM     — minimaxai/minimax-m3 (chat completions REST)
2. TTS           — nvidia/magpie-tts-multilingual (gRPC via nvidia-riva-client)
3. ASR           — nvidia/parakeet-ctc-1.1b-asr (gRPC via nvidia-riva-client)
4. Translation   — nvidia/riva-translate-4b-instruct-v1_1 (chat completions REST)
5. Voicechat     — nvidia/nemotron-voicechat (chat completions REST)
6. Magpie TTS ZS — nvidia/magpie-tts-zeroshot (Free Endpoint, gRPC)

IMPORTANT:
  - Speech NIM (TTS/ASR) ক্লাউডে gRPC দিয়ে কাজ করে (grpc.nvcf.nvidia.com:443)
  - Chat/Translation/Voicechat — REST /v1/chat/completions দিয়ে কাজ করে
  - pip install nvidia-riva-client  (TTS/ASR gRPC এর জন্য)

Usage:
  python test_all_speech_models.py              (প্রথম key দিয়ে)
  python test_all_speech_models.py --all-keys   (সব key দিয়ে)
"""
import os
import re
import sys
import json
import time
import requests
from datetime import datetime

# ────────────────────── Path & URL ──────────────────────
KEY_FILE = os.path.join(os.path.dirname(__file__), "NVIDIA NIM API KEY.txt")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "test_output")
CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# gRPC TTS/ASR config
GRPC_URI = "grpc.nvcf.nvidia.com:443"
TTS_FUNCTION_ID = "877104f7-e885-42b9-8de8-f6e4c6303969"  # Magpie-TTS-Multilingual


# ═══════════════════ Key Loading ═══════════════════

def load_all_keys():
    items = []
    with open(KEY_FILE, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or ":" not in line:
                continue
            label, _, rest = line.partition(":")
            m = re.search(r"nvapi-[A-Za-z0-9_\-]+", rest)
            if m:
                items.append((label.strip(), m.group(0)))
    return items


def get_api_key():
    key = os.getenv("NVIDIA_API_KEY")
    if not key:
        keys = load_all_keys()
        if keys:
            key = keys[0][1]
    if not key:
        raise SystemExit("API key not found.")
    return key


# ═══════════════════ REST-based Tests ═══════════════════

def test_chat_llm(api_key, timeout=90):
    """Chat LLM (minimax-m3) via REST."""
    t0 = time.time()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "minimaxai/minimax-m3",
        "messages": [{"role": "user", "content": "say OK"}],
        "max_tokens": 8,
        "stream": False,
    }
    try:
        r = requests.post(CHAT_URL, headers=headers, json=payload, timeout=timeout)
        elapsed = time.time() - t0
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:120]}", elapsed
        reply = r.json()["choices"][0]["message"]["content"]
        return True, f'reply="{reply[:40]}"', elapsed
    except Exception as exc:
        return False, str(exc)[:120], time.time() - t0


def test_translate(api_key, timeout=90):
    """Translation (Riva 4B) via REST chat completions."""
    t0 = time.time()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "nvidia/riva-translate-4b-instruct-v1_1",
        "messages": [
            {"role": "system", "content": "Translate from English to German. Output only the translation."},
            {"role": "user", "content": "Artificial intelligence is changing the world."}
        ],
        "temperature": 0.2,
        "max_tokens": 128,
        "stream": False,
    }
    try:
        r = requests.post(CHAT_URL, headers=headers, json=payload, timeout=timeout)
        elapsed = time.time() - t0
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:120]}", elapsed
        reply = r.json()["choices"][0]["message"]["content"]
        return True, f'"{reply[:80]}"', elapsed
    except Exception as exc:
        return False, str(exc)[:120], time.time() - t0


def test_voicechat(api_key, timeout=90):
    """Voicechat (Nemotron) via REST chat completions."""
    t0 = time.time()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "nvidia/nemotron-voicechat",
        "messages": [{"role": "user", "content": "Say hello briefly."}],
        "temperature": 0.7,
        "max_tokens": 64,
        "stream": False,
    }
    try:
        r = requests.post(CHAT_URL, headers=headers, json=payload, timeout=timeout)
        elapsed = time.time() - t0
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}: {r.text[:120]}", elapsed
        reply = r.json()["choices"][0]["message"]["content"]
        return True, f'"{reply[:80]}"', elapsed
    except Exception as exc:
        return False, str(exc)[:120], time.time() - t0


# ═══════════════════ gRPC-based Tests (TTS/ASR) ═══════════════════

def test_tts_grpc(api_key):
    """TTS via gRPC (nvidia-riva-client) -> grpc.nvcf.nvidia.com:443"""
    t0 = time.time()
    try:
        import riva.client
        from riva.client.proto.riva_audio_pb2 import AudioEncoding
    except ImportError:
        return False, "pip install nvidia-riva-client needed", time.time() - t0

    try:
        auth = riva.client.Auth(
            uri=GRPC_URI,
            use_ssl=True,
            metadata_args=[
                ["function-id", TTS_FUNCTION_ID],
                ["authorization", f"Bearer {api_key}"],
            ],
        )
        service = riva.client.SpeechSynthesisService(auth)
        resp = service.synthesize(
            text="Hello, this is a test.",
            voice="Magpie-Multilingual.EN-US.Aria",
            language_code="en-US",
            sample_rate_hz=22050,
            encoding=AudioEncoding.LINEAR_PCM,
        )
        elapsed = time.time() - t0
        audio_bytes = len(resp.audio)
        if audio_bytes > 0:
            # WAV save
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            import wave
            outpath = os.path.join(OUTPUT_DIR, "tts_grpc_test.wav")
            with wave.open(outpath, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(22050)
                wf.writeframesraw(resp.audio)
            return True, f"audio={audio_bytes//1024}KB -> {outpath}", elapsed
        return False, "empty audio response", elapsed
    except Exception as exc:
        return False, str(exc)[:120], time.time() - t0


def test_asr_grpc(api_key):
    """ASR via gRPC (nvidia-riva-client) -> grpc.nvcf.nvidia.com:443"""
    t0 = time.time()
    try:
        import riva.client
    except ImportError:
        return False, "pip install nvidia-riva-client needed", time.time() - t0

    try:
        # We need an audio file to transcribe
        # Generate a simple WAV
        import math, struct
        sr, dur = 16000, 2.0
        samples = [int(8000 * math.sin(2 * math.pi * 440 * i / sr)) for i in range(int(sr * dur))]
        pcm = struct.pack(f"<{len(samples)}h", *samples)

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        wav_path = os.path.join(OUTPUT_DIR, "asr_test_tone.wav")
        import wave
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframesraw(pcm)

        # Note: Cloud ASR via gRPC requires a function-id which varies by model
        # For now, we report that ASR requires self-hosted NIM or specific function-id
        return False, "ASR cloud gRPC function-id needed (self-host recommended)", time.time() - t0
    except Exception as exc:
        return False, str(exc)[:120], time.time() - t0


# ═══════════════════ Main ═══════════════════

def run_all_tests(api_key, label="default"):
    """Run all model tests sequentially."""
    tests = [
        ("1. Chat LLM (minimax-m3)", test_chat_llm),
        ("2. Translation (Riva 4B)", test_translate),
        ("3. Voicechat (Nemotron)", test_voicechat),
        ("4. TTS gRPC (Magpie)", test_tts_grpc),
        ("5. ASR gRPC (Parakeet)", test_asr_grpc),
    ]
    results = []
    for name, fn in tests:
        print(f"  ... {name}", end=" ", flush=True)
        ok, msg, elapsed = fn(api_key)
        tag = "PASS" if ok else "FAIL"
        print(f"-> {tag} ({elapsed:.1f}s)")
        if not ok:
            print(f"      {msg[:100]}")
        results.append((name, ok, msg, elapsed))
    return results


def main():
    all_keys_mode = "--all-keys" in sys.argv
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print("=" * 62)
    print("  NVIDIA NIM -- Speech Model Master Tester (v2)")
    print(f"  {ts}")
    print("=" * 62)

    # Check riva client
    riva_ok = True
    try:
        import riva.client
        print("  nvidia-riva-client: installed")
    except ImportError:
        riva_ok = False
        print("  nvidia-riva-client: NOT installed (TTS/ASR gRPC will skip)")
        print("  Install: pip install nvidia-riva-client")

    if all_keys_mode:
        keys = load_all_keys()
        if not keys:
            raise SystemExit("No API keys found.")
        print(f"\n  {len(keys)} key(s) found -- testing all.\n")

        all_results = {}
        for label, key in keys:
            print(f"\n{'_' * 60}")
            print(f"  Key: {label} ({key[:14]}...)")
            print(f"{'_' * 60}")
            all_results[label] = run_all_tests(key, label)

        # Grand summary
        print("\n\n" + "=" * 75)
        print("  GRAND SUMMARY")
        print("=" * 75)
        header_names = ["Chat", "NMT", "Voice", "TTS", "ASR"]
        print(f"  {'Key':<20}", end="")
        for h in header_names:
            print(f" {h:<8}", end="")
        print("  Time(s)")
        print("  " + "-" * 70)
        for label, results in all_results.items():
            total_time = sum(e for _, _, _, e in results)
            print(f"  {label:<20}", end="")
            for _, ok, _, _ in results:
                print(f" {'PASS':<8}" if ok else f" {'FAIL':<8}", end="")
            print(f"  {total_time:.1f}s")
        print("  " + "-" * 70)

    else:
        api_key = get_api_key()
        print(f"\n  API key: {api_key[:14]}...\n")
        results = run_all_tests(api_key)

        print("\n" + "=" * 60)
        print("  Summary:")
        print(f"  {'Model':<30} {'Status':<8} {'Time':<8}")
        print("  " + "-" * 50)
        for name, ok, msg, elapsed in results:
            print(f"  {name:<30} {'PASS' if ok else 'FAIL':<8} {elapsed:.1f}s")
        passed = sum(1 for _, ok, _, _ in results if ok)
        print(f"\n  Result: {passed}/{len(results)} passed.")

    print("\n  Individual test scripts:")
    print("    python test_tts_magpie.py")
    print("    python test_asr_parakeet.py")
    print("    python test_translate_riva.py")
    print("    python test_voicechat_nemotron.py")
    print("    python test_key_IrakIroan.py")
    print("    python test_key_AlcoStore.py")
    print("    python bulk_key_tester.py")


if __name__ == "__main__":
    main()
