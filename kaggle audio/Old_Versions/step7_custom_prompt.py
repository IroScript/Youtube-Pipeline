# =============================================================================
# 🎤 VERSION 7: YOUR VOICE, YOUR SCRIPT — CUSTOM PROMPT INPUT
# =============================================================================
# আপনার নিজের লেখা স্ক্রিপ্ট ইনপুট দিন, মেল ভয়েসে জেনারেট হবে!
# Kaggle নোটবুকে নতুন সেলে পেস্ট করে রান করুন।
# =============================================================================

import os, time, json, urllib.request

BASE_OUTPUT_DIR = "/kaggle/working/outputs/v7_custom_prompt"
API_URL = "http://localhost:3900/v1/audio/speech"

def gen(text, voice="onyx", model="tts-1-hd", output_path="",
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
            print(f"  ✅ DONE!")
            print(f"     📁 {os.path.basename(output_path)}")
            print(f"     📊 {kb} KB")
            print(f"     ⏱️  Generation time: {dur:.1f}s")
    except Exception as e:
        print(f"  ❌ FAILED: {e}")


# =============================================================================
# ✏️ আপনার স্ক্রিপ্ট নিচে লিখুন
# =============================================================================
# 💡 প্রম্পটিং গাইড:
#
# 🔥 রাগ/ক্রোধ      → CAPS ব্যবহার করুন, ! দিন, ছোট ছোট বাক্য
#                      "NO! I will NOT let this happen! You HEAR me?!"
#
# 😢 দুঃখ/কান্না     → "..." দিয়ে থামুন, ধীর গতির বাক্য
#                      "She's gone... I... I can't believe it..."
#
# 🤫 ফিসফিস          → "..." বেশি দিন, ছোট বাক্য, সরাসরি সম্বোধন
#                      "Listen... don't move... they're right outside..."
#
# 😂 উত্তেজনা/হাসি   → "Ha ha ha!", "!", দ্রুত বাক্য, ইন্টারজেকশন
#                      "Ha ha ha! Oh man! I can't believe it!"
#
# 👻 ভয়/আতঙ্ক       → "..." দিয়ে থামুন, প্রশ্ন করুন, ধীরে বলুন
#                      "Do you hear that?... What was that sound?..."
#
# ⚔️ বীরত্ব          → গম্ভীর, দীর্ঘ বাক্য, মেটাফোর ব্যবহার করুন
#                      "I am the storm. I will not fall. I will rise."
#
# 💕 রোমান্টিক       → নরম শব্দ, "..." দিয়ে পজ, আবেগপূর্ণ
#                      "I fell... completely... in love with you."
#
# 🤒 অসুস্থ/ক্লান্ত  → "Ugh...", ছোট বাক্য, শ্বাসকষ্ট বোঝানো
#                      "Ugh... can barely breathe... everything hurts..."
# =============================================================================

MY_SCRIPT = """
PUT YOUR SCRIPT HERE. REPLACE THIS ENTIRE TEXT WITH YOUR OWN.
"""

# =============================================================================
# ⚙️ SETTINGS — প্রয়োজনে পরিবর্তন করুন
# =============================================================================
VOICE = "onyx"          # মেল ভয়েস: "onyx" (গভীর), "echo" (মধ্যম), "alloy" (হালকা)
SPEED = 0.88            # 0.7 = খুব ধীর, 0.88 = সিনেমাটিক, 1.0 = স্বাভাবিক, 1.1 = দ্রুত
GUIDANCE = 2.5          # 1.5 = শান্ত, 2.0 = স্বাভাবিক, 2.5 = আবেগপূর্ণ, 3.0 = চরম আবেগ
FILENAME = "v7_custom"  # আউটপুট ফাইলের নাম (এক্সটেনশন ছাড়া)

# =============================================================================
# 🚀 GENERATE
# =============================================================================
text = MY_SCRIPT.strip()

print("=" * 70)
print("🎤  VERSION 7 — YOUR VOICE, YOUR SCRIPT")
print("=" * 70)
print(f"📝  Script: {len(text)} chars")
print(f"🎙️  Voice: {VOICE}")
print(f"⚡  Speed: {SPEED} | Guidance: {GUIDANCE}")
print(f"📂  Output: {BASE_OUTPUT_DIR}")
print("=" * 70)

if text == "PUT YOUR SCRIPT HERE. REPLACE THIS ENTIRE TEXT WITH YOUR OWN.":
    print("\n⚠️  আপনি এখনো নিজের স্ক্রিপ্ট লেখেননি!")
    print("    MY_SCRIPT ভ্যারিয়েবলে আপনার টেক্সট পেস্ট করুন।")
else:
    print(f"\n🎤 Generating with {VOICE} voice...")
    gen(
        text=text,
        voice=VOICE,
        model="tts-1-hd",
        output_path=f"{BASE_OUTPUT_DIR}/{FILENAME}_{VOICE}.wav",
        speed=SPEED,
        num_step=32,
        guidance_scale=GUIDANCE,
    )
    print(f"\n{'=' * 70}")
    print(f"🎉  GENERATED: {FILENAME}_{VOICE}.wav")
    print(f"{'=' * 70}")
