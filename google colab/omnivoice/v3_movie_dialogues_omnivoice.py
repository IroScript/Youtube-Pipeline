"""
OmniVoice v3 — Movie Dialogues (Hindi, Bangla, Hollywood)
===========================================================
1. Sholay - Gabbar Singh (Hindi)
2. Ammajan - Manna (Bangla)
3. Gladiator - Maximus (English)
OmniVoice supports 646 languages — real multilingual!
"""
SCRIPT = r'''#!/usr/bin/env python3
import subprocess, os

os.makedirs("/content/omnivoice/omnivoice", exist_ok=True)

def gen(text, voice, filename):
    import json
    payload = json.dumps({"model":"tts-1","voice":voice,"input":text,"response_format":"wav"})
    result = subprocess.run([
        "curl", "-s", "--max-time", "300",
        "http://localhost:3900/v1/audio/speech",
        "-H", "Content-Type: application/json",
        "-d", payload,
        "--output", f"/content/omnivoice/omnivoice/{filename}",
        "-w", "HTTP:%{http_code} SIZE:%{size_download} TIME:%{time_total}s"
    ], capture_output=True, text=True, timeout=320)
    print(f"  {filename}: {result.stdout}")

print("OmniVoice v3: Movie dialogues generating...")

# Sholay - Gabbar (Hindi)
gen("Kitne aadmi the? Do? Aur tum teen! Phir bhi wapas aa gaye... Khaali haath!",
    "alloy", "v3_sholay_gabbar_hindi.wav")

# Ammajan - Manna (Bangla)
gen("আম্মাজান! আপনি শুধু একটা বার নির্দেশ দেন, আজ পুরো পৃথিবীকে আমি আপনার পায়ের নিচে এনে হাজির করব!",
    "onyx", "v3_ammajan_manna_bangla.wav")

# Gladiator - Maximus (English)
gen("My name is Maximus Decimus Meridius, commander of the Armies of the North, General of the Felix Legions, and loyal servant to the true emperor, Marcus Aurelius. Father to a murdered son, husband to a murdered wife. And I will have my vengeance, in this life or the next.",
    "echo", "v3_gladiator_maximus_english.wav")

print("OmniVoice v3 complete!")
'''
