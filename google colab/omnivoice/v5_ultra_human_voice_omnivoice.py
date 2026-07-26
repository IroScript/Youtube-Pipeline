"""
OmniVoice v5 — Ultra Human-like Deep Male Voice
=================================================
shimmer voice (user's favorite) + high quality settings + emotions
Features: breathing, coughing, laughter, sadness, anger, whisper
"""
SCRIPT = r'''#!/usr/bin/env python3
import subprocess, os, json

os.makedirs("/content/omnivoice/omnivoice", exist_ok=True)

def gen_advanced(text, voice, filename, speed=1.0, num_step=32, guidance=2.0, instruct=None, engine=None):
    """Generate with advanced parameters via /v1/audio/speech"""
    payload = {
        "model": "tts-1",
        "voice": voice,
        "input": text,
        "response_format": "wav",
        "speed": speed,
        "num_step": num_step,
        "guidance_scale": guidance,
    }
    if instruct:
        payload["instruct"] = instruct
    if engine:
        payload["engine"] = engine
    
    result = subprocess.run([
        "curl", "-s", "--max-time", "300",
        "http://localhost:3900/v1/audio/speech",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload),
        "--output", f"/content/omnivoice/omnivoice/{filename}",
        "-w", "HTTP:%{http_code} SIZE:%{size_download} TIME:%{time_total}s"
    ], capture_output=True, text=True, timeout=320)
    print(f"  {filename}: {result.stdout}")
    if result.stderr:
        err = [l for l in result.stderr.split('\n') if l.strip()]
        if err:
            print(f"    stderr: {err[0][:100]}")

def gen_native(text, voice, filename, speed=1.0, num_step=32, guidance=2.0, instruct=None, effect="broadcast"):
    """Generate via /generate endpoint for more control"""
    payload = {
        "text": text,
        "profile_id": voice,
        "speed": speed,
        "num_step": num_step,
        "guidance_scale": guidance,
        "effect_preset": effect,
        "denoise": True,
        "postprocess_output": True,
    }
    if instruct:
        payload["instruct"] = instruct
    
    result = subprocess.run([
        "curl", "-s", "--max-time", "300",
        "http://localhost:3900/generate",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload),
        "--output", f"/content/omnivoice/omnivoice/{filename}",
        "-w", "HTTP:%{http_code} SIZE:%{size_download} TIME:%{time_total}s"
    ], capture_output=True, text=True, timeout=320)
    print(f"  {filename}: {result.stdout}")

# Check available effects
print("=== Available Effects ===")
eff = subprocess.run(["curl", "-sf", "http://localhost:3900/tools/effects"], 
    capture_output=True, text=True, timeout=10)
print(f"  {eff.stdout[:300]}")

# Check available engines
print("\n=== Available Engines ===")
import glob
engines = os.listdir("/content/omnivoice-studio/backend/engines/") if os.path.exists("/content/omnivoice-studio/backend/engines/") else []
print(f"  {[e for e in engines if not e.startswith('_') and e != '__pycache__']}")

print("\n" + "="*60)
print("  V5: ULTRA HUMAN SHIMMER — Emotional Range Test")
print("="*60)

# === PART A: Quality & Speed variations ===
print("\n--- A: Quality/Speed (shimmer, num_step=32) ---")

gen_advanced(
    "The darkness does not scare me anymore. I have walked through fire... through war... through loss. And still... I stand.",
    "shimmer", "v5_human_shimmer_slow.wav", speed=0.85, num_step=32, guidance=2.5
)

gen_advanced(
    "The darkness does not scare me anymore. I have walked through fire... through war... through loss. And still... I stand.",
    "shimmer", "v5_human_shimmer_hq32.wav", speed=1.0, num_step=32, guidance=2.0
)

gen_advanced(
    "The darkness does not scare me anymore. I have walked through fire... through war... through loss. And still... I stand.",
    "shimmer", "v5_human_shimmer_hq64.wav", speed=1.0, num_step=64, guidance=2.0
)

# === PART B: Emotional expressions with natural text cues ===
print("\n--- B: Emotional Expressions ---")

# Anger / Rage
gen_advanced(
    "No! NO! I will NOT let this happen again! You hear me?! I have given EVERYTHING! Every last drop of blood, every ounce of strength! And you... you dare to stand there and tell me it was all for NOTHING?!",
    "shimmer", "v5_emotion_rage.wav", speed=1.05, num_step=32, guidance=3.0
)

# Sadness / Grief with breathing pauses
gen_advanced(
    "She's gone... I... I can't believe she's actually gone. We had so many plans... so many dreams we never... We never got to live them out. And now... this silence... it's deafening.",
    "shimmer", "v5_emotion_sadness.wav", speed=0.85, num_step=32, guidance=2.0
)

# Laughter / Joy
gen_advanced(
    "Ha ha ha! Oh man, you should have seen the look on his face! I swear, I haven't laughed this hard in years! Oh god, my stomach hurts from laughing!",
    "shimmer", "v5_emotion_laughter.wav", speed=1.0, num_step=32, guidance=2.0
)

# Whispering / Secretive
gen_advanced(
    "Listen carefully... I'm only going to say this once. They're watching us. Don't turn around. Just keep walking, and when I say run... you run. Do you understand?",
    "shimmer", "v5_emotion_whisper.wav", speed=0.8, num_step=32, guidance=1.5
)

# Coughing / Sick
gen_advanced(
    "Ugh... I feel terrible. This cold is killing me. Can barely breathe through my nose... My throat is raw and scratchy. Every time I try to speak... it hurts.",
    "shimmer", "v5_emotion_sick.wav", speed=0.9, num_step=32, guidance=2.0
)

# Exhaustion / Tired
gen_advanced(
    "I... I can barely keep my eyes open. How long have we been walking? My legs are shaking... I need to rest. Just... just give me a moment... please.",
    "shimmer", "v5_emotion_exhaustion.wav", speed=0.75, num_step=32, guidance=2.0
)

# === PART C: Try different engines ===
print("\n--- C: Engine variations (same text, shimmer) ---")
TEST_TEXT = "I have seen things you people wouldn't believe. Attack ships on fire off the shoulder of Orion. All those moments will be lost in time, like tears in rain."

for eng in ["confucius4", "moss_tts_v15", "supertonic3", "dots_tts"]:
    try:
        gen_advanced(TEST_TEXT, "shimmer", f"v5_engine_{eng}.wav", 
                    speed=1.0, num_step=32, engine=eng)
    except:
        print(f"  Engine {eng} failed")

# === PART D: Native /generate endpoint ===
print("\n--- D: Native generate endpoint ---")
gen_native(
    "The night is darkest just before the dawn. And I promise you... the dawn is coming.",
    "demo0001", "v5_native_demo.wav", speed=0.9, num_step=32, guidance=2.5
)

print("\n" + "="*60)
print("  V5 COMPLETE!")
print("="*60)
'''
