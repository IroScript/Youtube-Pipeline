# =============================================================================
# 🎭 VERSION 6: ONE VOICE, ALL EMOTIONS — SINGLE FILE
# =============================================================================
# একটি মাত্র অডিও ফাইল জেনারেট হবে (1-3 মিনিট)
# একই ভয়েসে হাসি, কান্না, ফিসফিস, রাগ, ভয় — সব ইমোশন একসাথে!
# Kaggle নোটবুকে নতুন সেলে পেস্ট করে রান করুন।
# =============================================================================

import os, time, json, urllib.request

BASE_OUTPUT_DIR = "/kaggle/working/outputs/v6_single_all_emotions"
API_URL = "http://localhost:3900/v1/audio/speech"

def gen(text, voice="shimmer", model="tts-1-hd", output_path="",
        speed=1.0, num_step=32, guidance_scale=2.0):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    payload = {
        "model": model, "voice": voice, "input": text,
        "response_format": "wav", "speed": speed,
        "num_step": num_step, "guidance_scale": guidance_scale,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data,
                                headers={"Content-Type": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            content = resp.read()
            with open(output_path, "wb") as f:
                f.write(content)
            dur = time.time() - t0
            kb = len(content) // 1024
            minutes = (kb / 176)  # rough WAV estimate: ~176 KB/sec @ 16-bit mono
            print(f"  ✅ DONE!")
            print(f"     📁 {os.path.basename(output_path)}")
            print(f"     📊 {kb} KB (~{minutes:.1f} sec estimated)")
            print(f"     ⏱️  Generation time: {dur:.1f}s")
    except Exception as e:
        print(f"  ❌ FAILED: {e}")

# =============================================================================
# 🎬 THE MONOLOGUE — এক ভয়েসে সব ইমোশন
# =============================================================================
# এটা একটা ক্যারেক্টারের মনোলগ যেখানে সে স্বাভাবিকভাবে এক ইমোশন থেকে
# আরেক ইমোশনে যায় — ঠিক যেন একটা সিনেমার ক্লাইম্যাক্স সিন।
# =============================================================================

MONOLOGUE = """
You know what's funny? Ha ha ha! I actually thought we'd make it. I really did. I used to sit there, planning our future, laughing about the stupid things we'd do when we got old. Ha ha ha! Remember that time you tried to cook pasta and set the fire alarm off? Oh man, I laughed so hard I couldn't breathe! Ha ha ha!

But then... then everything changed.

She's gone. I still can't say it without my voice breaking. We had so many plans... so many dreams we never got to live out. I keep reaching for my phone to call her, and then I remember. Every single time, it hits me like the first time. The house is so quiet now. Her chair is still there, exactly where she left it. I haven't moved it. I can't. Sometimes I sit next to it and just... talk to her. Like she's still here. Like she can still hear me.

Listen... listen carefully. I'm only going to say this once. They're watching us. Don't turn around. Don't look at the window. Just keep walking, nice and slow, like nothing is wrong. There's a car waiting two blocks east. Silver sedan, engine running. When I say run... you run. And don't look back. No matter what you hear behind us... don't... look... back.

No! NO! I will NOT let this happen again! You hear me?! I have given EVERYTHING! Every last drop of blood, every ounce of strength I had left! And you DARE stand there and tell me it wasn't enough?! I will burn this whole world down before I let them take what's mine! You want war? FINE! You've got one! And I promise you... I PROMISE you... you will NOT survive it!

Do you hear that? That scratching sound... behind the wall. It's been going on for three nights now. Always at exactly three fifteen in the morning. I told myself it was rats. I told myself it was the old pipes. But then last night... last night, it whispered my name. And when I pressed my ear against the wall... I felt something... press back.

Ugh... I feel terrible. This cold is killing me. Can barely breathe through my nose. My throat is raw and scratchy. Every time I try to speak, it hurts. My head is pounding. My body aches everywhere. I just want to crawl into bed and not move for a week.

But I can't stop. Not now. Not after everything.

The darkness does not scare me anymore. I have walked through fire. Through war. Through loss. And still... I stand. Because I am not built from hope alone. I am forged from pain, from rage, from the silence between heartbeats. They thought they could break me. They were wrong. I am the storm they never saw coming. And when I rise... the earth will tremble.

And you know what keeps me going through all of this? You. I don't know when it started. Maybe it was the way you laugh, the way your eyes light up when you talk about the things you love. Maybe it was that rainy Tuesday when you held my hand and didn't let go. Somewhere between all the chaos and the noise... I fell. Completely, hopelessly, irreversibly in love with you.

So no... I'm not giving up. Not today. Not ever. Listen to me. I don't care how many times I've fallen. I don't care how many people said it's impossible. I am still here. I am still breathing. And that means I still have a chance. So I'll get up. I'll wipe the dust off. And I'll show this world... what I'm made of.
"""

# =============================================================================
# 🚀 GENERATE
# =============================================================================
print("=" * 70)
print("🎭  VERSION 6 — ONE VOICE, ALL EMOTIONS, SINGLE FILE")
print("=" * 70)
print(f"📝  Script length: {len(MONOLOGUE)} characters")
print(f"📂  Output: {BASE_OUTPUT_DIR}")
print("=" * 70)

# --- Main generation: shimmer voice ---
print("\n🎤 Generating with SHIMMER voice (best emotional range)...")
gen(
    text=MONOLOGUE.strip(),
    voice="shimmer",
    model="tts-1-hd",
    output_path=f"{BASE_OUTPUT_DIR}/v6_all_emotions_shimmer.wav",
    speed=0.88,
    num_step=32,
    guidance_scale=2.5,
)

print(f"\n{'=' * 70}")
print("🎉  VERSION 6 — SINGLE FILE GENERATED!")
print(f"{'=' * 70}")
print(f"📂 Output: {BASE_OUTPUT_DIR}/v6_all_emotions_shimmer.wav")
print()
print("🎬 এই একটি ফাইলে যা যা আছে:")
print("   😂 হাসি (Laughter)        — প্যারাগ্রাফ ১")
print("   😢 কান্না (Sadness)        — প্যারাগ্রাফ ২")
print("   🤫 ফিসফিস (Whisper)       — প্যারাগ্রাফ ৩")
print("   🔥 ক্রোধ (Rage)           — প্যারাগ্রাফ ৪")
print("   👻 ভয়ংকর (Horror)        — প্যারাগ্রাফ ৫")
print("   🤒 অসুস্থ (Sick)          — প্যারাগ্রাফ ৬")
print("   ⚔️ বীরত্ব (Heroic)        — প্যারাগ্রাফ ৭")
print("   💕 রোমান্টিক (Romantic)    — প্যারাগ্রাফ ৮")
print("   🚀 অনুপ্রেরণা (Motivational) — প্যারাগ্রাফ ৯")
print(f"{'=' * 70}")
