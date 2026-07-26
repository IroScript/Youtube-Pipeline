"""
Kaggle OmniVoice Batch Generator (v1 to v5)
============================================
Runs locally inside Kaggle notebook server (localhost:3900).
Backend server started via subprocess.Popen in Step 3.
Generates all audio samples and organizes them in /kaggle/working/outputs/
"""

import os
import time
import json
import urllib.request
import urllib.parse

BASE_OUTPUT_DIR = "/kaggle/working/outputs"
API_URL = "http://localhost:3900/v1/audio/speech"

def check_server():
    print("⏳ Checking OmniVoice server health...")
    for _ in range(30):
        try:
            req = urllib.request.Request("http://localhost:3900/health")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode())
                    print(f"✅ Server Ready: {data}")
                    return True
        except Exception:
            time.sleep(3)
    print("❌ Server timed out!")
    return False

def generate_speech(text, voice="shimmer", model="tts-1", output_path="", speed=1.0, num_step=32, guidance_scale=2.0, instruct=None):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    payload = {
        "model": model,
        "voice": voice,
        "input": text,
        "response_format": "wav",
        "speed": speed,
        "num_step": num_step,
        "guidance_scale": guidance_scale
    }
    if instruct:
        payload["instruct"] = instruct
        
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data, headers={"Content-Type": "application/json"})
    
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            content = resp.read()
            with open(output_path, "wb") as f:
                f.write(content)
            dt = time.time() - t0
            size_kb = len(content) // 1024
            print(f"  [SUCCESS] {os.path.basename(output_path)} ({size_kb} KB in {dt:.1f}s)")
            return True
    except Exception as e:
        print(f"  [ERROR] {os.path.basename(output_path)}: {e}")
        return False

def main():
    if not check_server():
        return
        
    print("\n🚀 Starting Full Batch Generation (v1 - v5)...")
    
    # ----------------------------------------------------
    # V1: Basic Test Samples
    # ----------------------------------------------------
    print("\n📦 Generating V1: Test Samples...")
    v1_dir = os.path.join(BASE_OUTPUT_DIR, "v1_test")
    generate_speech(
        "Hello! This is OmniVoice Studio running on Kaggle GPU. Everything is local and fast.",
        voice="alloy", output_path=os.path.join(v1_dir, "v1_test_alloy.wav")
    )
    generate_speech(
        "Welcome to the voice pipeline. Testing echo voice preset.",
        voice="echo", output_path=os.path.join(v1_dir, "v1_test_echo.wav")
    )

    # ----------------------------------------------------
    # V2: GI Joe McCullen Dialogue
    # ----------------------------------------------------
    print("\n📦 Generating V2: McCullen Nanomites Dialogue...")
    v2_dir = os.path.join(BASE_OUTPUT_DIR, "v2_gi_joe_mccullen_nanomites")
    mccullen_text = "Nanomites... programmed to devour metal, steel, flesh. But more importantly, they can be programmed to stop. The real-world applications are endless... So, you tell me... is it working?"
    generate_speech(mccullen_text, voice="alloy", output_path=os.path.join(v2_dir, "v2_mccullen_alloy.wav"))
    generate_speech(mccullen_text, voice="onyx", output_path=os.path.join(v2_dir, "v2_mccullen_onyx.wav"))
    generate_speech(mccullen_text, voice="shimmer", output_path=os.path.join(v2_dir, "v2_mccullen_shimmer.wav"))

    # ----------------------------------------------------
    # V3: Movie Dialogues (Hindi, Bangla, Hollywood)
    # ----------------------------------------------------
    print("\n📦 Generating V3: Iconic Movie Dialogues...")
    v3_dir = os.path.join(BASE_OUTPUT_DIR, "v3_movie_dialogues")
    sholay = "Kitne aadmi the? ... Do? ... Aur tum teen! ... Phir bhi wapas aa gaye... Khaali haath!"
    ammajan = "আম্মাজান! আপনি শুধু একটা বার নির্দেশ দেন, আজ পুরো পৃথিবীকে আমি আপনার পায়ের নিচে এনে হাজির করব!"
    gladiator = "My name is Maximus Decimus Meridius, commander of the Armies of the North, General of the Felix Legions, and loyal servant to the true emperor, Marcus Aurelius. Father to a murdered son, husband to a murdered wife. And I will have my vengeance, in this life or the next."
    
    generate_speech(sholay, voice="alloy", output_path=os.path.join(v3_dir, "v3_sholay_gabbar_hindi.wav"))
    generate_speech(ammajan, voice="onyx", output_path=os.path.join(v3_dir, "v3_ammajan_manna_bangla.wav"))
    generate_speech(gladiator, voice="shimmer", output_path=os.path.join(v3_dir, "v3_gladiator_maximus_english.wav"))

    # ----------------------------------------------------
    # V4: Deep Male Voice Exploration (Shimmer focus)
    # ----------------------------------------------------
    print("\n📦 Generating V4: Deep Male Voice Exploration...")
    v4_dir = os.path.join(BASE_OUTPUT_DIR, "v4_deep_male_voice")
    deep_text = "The darkness does not scare me. I have walked through fire, through war, through loss. And still I stand. Because I am not built from hope alone. I am forged from pain, from rage, from the silence between heartbeats."
    for v in ["shimmer", "onyx", "echo", "alloy", "demo0001"]:
        generate_speech(deep_text, voice=v, model="tts-1-hd", num_step=32, speed=0.9,
                        output_path=os.path.join(v4_dir, f"v4_deep_male_hd_{v}.wav"))

    # ----------------------------------------------------
    # V5: Ultra Human Voice & Emotional Expressions (Shimmer)
    # ----------------------------------------------------
    print("\n📦 Generating V5: Ultra Human & Emotional Expressions (Shimmer)...")
    v5_dir = os.path.join(BASE_OUTPUT_DIR, "v5_ultra_human_voice")
    
    # 1. High Quality & Speed variations
    generate_speech("The darkness does not scare me anymore. I have walked through fire... through war... through loss. And still... I stand.",
                    voice="shimmer", speed=0.85, num_step=32, guidance_scale=2.5,
                    output_path=os.path.join(v5_dir, "v5_shimmer_slow_hq.wav"))
    generate_speech("The darkness does not scare me anymore. I have walked through fire... through war... through loss. And still... I stand.",
                    voice="shimmer", speed=1.0, num_step=64, guidance_scale=2.0,
                    output_path=os.path.join(v5_dir, "v5_shimmer_max_steps64.wav"))

    # 2. Emotional Expressions
    # Rage
    generate_speech("No! NO! I will NOT let this happen again! You hear me?! I have given EVERYTHING! Every last drop of blood, every ounce of strength!",
                    voice="shimmer", speed=1.05, num_step=32, guidance_scale=3.0,
                    output_path=os.path.join(v5_dir, "v5_emotion_rage.wav"))
    # Sadness / Grief
    generate_speech("She's gone... I... I can't believe she's actually gone. We had so many plans... so many dreams we never... We never got to live them out. And now... this silence... it's deafening.",
                    voice="shimmer", speed=0.85, num_step=32, guidance_scale=2.0,
                    output_path=os.path.join(v5_dir, "v5_emotion_sadness.wav"))
    # Laughter / Joy
    generate_speech("Ha ha ha! Oh man, you should have seen the look on his face! I swear, I haven't laughed this hard in years! Oh god, my stomach hurts from laughing!",
                    voice="shimmer", speed=1.0, num_step=32, guidance_scale=2.0,
                    output_path=os.path.join(v5_dir, "v5_emotion_laughter.wav"))
    # Whisper
    generate_speech("Listen carefully... I'm only going to say this once. They're watching us. Don't turn around. Just keep walking, and when I say run... you run.",
                    voice="shimmer", speed=0.8, num_step=32, guidance_scale=1.5,
                    output_path=os.path.join(v5_dir, "v5_emotion_whisper.wav"))
    # Coughing / Sick
    generate_speech("Ugh... I feel terrible. This cold is killing me. Can barely breathe through my nose... My throat is raw and scratchy. Every time I try to speak... it hurts.",
                    voice="shimmer", speed=0.9, num_step=32, guidance_scale=2.0,
                    output_path=os.path.join(v5_dir, "v5_emotion_sick.wav"))

    print("\n🎉 ALL V1-V5 BATCH GENERATIONS COMPLETE!")
    print(f"📁 Files saved in: {BASE_OUTPUT_DIR}")

if __name__ == "__main__":
    main()
