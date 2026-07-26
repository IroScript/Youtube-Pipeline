"""
OmniVoice v2 — McCullen Nanomites Dialogue
============================================
G.I. Joe movie dialogue, OmniVoice GPU inference।
"""
SCRIPT = r'''#!/usr/bin/env python3
import subprocess, os

os.makedirs("/content/omnivoice/omnivoice", exist_ok=True)

DIALOGUE = "Nanomites... programmed to devour metal, steel, flesh. But more importantly, they can be programmed to stop. The real-world applications are endless... So, you tell me... is it working?"

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

print("OmniVoice v2: McCullen dialogue generating...")
gen(DIALOGUE, "alloy", "v2_alloy.wav")
gen(DIALOGUE, "onyx", "v2_onyx.wav")
gen(DIALOGUE, "echo", "v2_echo.wav")
print("OmniVoice v2 complete!")
'''
