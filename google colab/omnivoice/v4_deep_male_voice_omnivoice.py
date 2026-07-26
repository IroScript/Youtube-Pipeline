"""
OmniVoice v4 — Deep Male Human Voice Test
===========================================
সব voice (alloy, echo, onyx, fable, nova, shimmer, demo0001) +
tts-1 ও tts-1-hd মডেল দিয়ে deep male voice comparison।
User liked alloy best — now testing ALL for the most human-like deep male.
"""
SCRIPT = r'''#!/usr/bin/env python3
import subprocess, os, json

os.makedirs("/content/omnivoice/omnivoice", exist_ok=True)

TEXT = "The darkness does not scare me. I have walked through fire, through war, through loss. And still I stand. Because I am not built from hope alone. I am forged from pain, from rage, from the silence between heartbeats. And when the world asks me to kneel, I rise."

def gen(text, voice, model, filename):
    payload = json.dumps({"model": model, "voice": voice, "input": text, "response_format": "wav"})
    result = subprocess.run([
        "curl", "-s", "--max-time", "300",
        "http://localhost:3900/v1/audio/speech",
        "-H", "Content-Type: application/json",
        "-d", payload,
        "--output", f"/content/omnivoice/omnivoice/{filename}",
        "-w", "HTTP:%{http_code} SIZE:%{size_download} TIME:%{time_total}s"
    ], capture_output=True, text=True, timeout=320)
    print(f"  {filename}: {result.stdout}")

print("OmniVoice v4: Deep Male Voice Test")
print("="*50)

# tts-1 model — all voices
print("\n--- tts-1 model ---")
for voice in ["alloy", "echo", "onyx", "fable", "nova", "shimmer", "demo0001"]:
    gen(TEXT, voice, "tts-1", f"v4_deep_male_tts1_{voice}.wav")

# tts-1-hd model — all voices (higher quality)
print("\n--- tts-1-hd model ---")
for voice in ["alloy", "echo", "onyx", "fable", "nova", "shimmer", "demo0001"]:
    gen(TEXT, voice, "tts-1-hd", f"v4_deep_male_tts1hd_{voice}.wav")

print("\nOmniVoice v4 complete! 14 samples generated.")
'''
