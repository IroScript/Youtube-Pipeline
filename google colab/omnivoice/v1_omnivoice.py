"""
OmniVoice v1 — OmniVoice Studio GPU TTS
=========================================
সম্পূর্ণ GPU-ভিত্তিক। OpenAI-compatible API (localhost:3900)।
Colab-এ OmniVoice server চলতে হবে (setup_omnivoice.py দিয়ে)।
"""
SCRIPT = r'''#!/usr/bin/env python3
import subprocess, os

os.makedirs("/content/omnivoice/omnivoice", exist_ok=True)

def gen(text, voice, filename):
    result = subprocess.run([
        "curl", "-s", "--max-time", "300",
        "http://localhost:3900/v1/audio/speech",
        "-H", "Content-Type: application/json",
        "-d", f'{{"model":"tts-1","voice":"{voice}","input":"{text}","response_format":"wav"}}',
        "--output", f"/content/omnivoice/omnivoice/{filename}",
        "-w", "HTTP:%{http_code} SIZE:%{size_download} TIME:%{time_total}s"
    ], capture_output=True, text=True, timeout=320)
    print(f"  {filename}: {result.stdout}")

print("OmniVoice v1: Generating...")
gen("Hello! This is OmniVoice Studio running on Google Colab Tesla T4 GPU. Completely local, no cloud needed!", "alloy", "v1_alloy.wav")
gen("Welcome to the future of voice synthesis. OmniVoice gives you full control, running entirely on your own hardware.", "echo", "v1_echo.wav")
print("OmniVoice v1 complete!")
'''
