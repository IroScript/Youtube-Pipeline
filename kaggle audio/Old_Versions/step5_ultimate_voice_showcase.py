# =============================================================================
# 🎭 Step 5: ULTIMATE VOICE & EMOTION SHOWCASE (Single Script)
# =============================================================================
# এই স্ক্রিপ্ট একবার রান করলেই সব ভয়েস × সব ইমোশন কম্বিনেশনে
# আলাদা আলাদা হাই-কোয়ালিটি অডিও ফাইল জেনারেট হবে।
# Kaggle নতুন সেলে পেস্ট করে রান করুন।
# =============================================================================

import os, time, json, urllib.request

BASE_OUTPUT_DIR = "/kaggle/working/outputs/v5_ultimate_showcase"
API_URL = "http://localhost:3900/v1/audio/speech"

# ─── Generation Helper ───────────────────────────────────────────────────────
def gen(text, voice="shimmer", model="tts-1-hd", output_path="",
        speed=1.0, num_step=32, guidance_scale=2.0, instruct=None):
    """OmniVoice TTS দিয়ে একটি WAV ফাইল জেনারেট করে।"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    payload = {
        "model": model,
        "voice": voice,
        "input": text,
        "response_format": "wav",
        "speed": speed,
        "num_step": num_step,
        "guidance_scale": guidance_scale,
    }
    if instruct:
        payload["instruct"] = instruct
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data,
                                headers={"Content-Type": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            content = resp.read()
            with open(output_path, "wb") as f:
                f.write(content)
            dur = time.time() - t0
            kb = len(content) // 1024
            print(f"  ✅ {os.path.basename(output_path):50s} │ {kb:5d} KB │ {dur:5.1f}s │ voice={voice}")
    except Exception as e:
        print(f"  ❌ {os.path.basename(output_path)}: {e}")


# =============================================================================
# 📋 VOICE LIST — সব ভয়েস এখানে
# =============================================================================
ALL_VOICES = ["shimmer", "alloy", "onyx", "echo", "nova", "fable", "demo0001"]

# =============================================================================
# 🎬 EMOTION SCRIPTS — প্রতিটি ইমোশনের জন্য আলাদা ডায়ালগ ও সেটিংস
# =============================================================================
EMOTION_SCRIPTS = [
    # ── 1. RAGE / ক্রোধ ──────────────────────────────────────────────────────
    {
        "tag": "rage",
        "label": "🔥 RAGE (ক্রোধ)",
        "text": (
            "No! NO! I will NOT let this happen again! You hear me?! "
            "I have given EVERYTHING! Every last drop of blood, every ounce of strength! "
            "And you DARE stand there and tell me it wasn't enough?! "
            "I will BURN this whole world down before I let them take what's mine! "
            "You want war? FINE. You've got one. And I promise you... "
            "you will NOT survive it."
        ),
        "speed": 1.05,
        "guidance_scale": 3.0,
    },
    # ── 2. DEEP SADNESS / গভীর দুঃখ ─────────────────────────────────────────
    {
        "tag": "sadness",
        "label": "😢 SADNESS (দুঃখ)",
        "text": (
            "She's gone... I... I can't believe she's actually gone. "
            "We had so many plans... so many dreams we never... "
            "we never got to live them out. "
            "I keep reaching for my phone to call her... "
            "and then I remember. And it hits me all over again. "
            "The house is so quiet now. Her chair is still there, "
            "right where she left it. And this silence... "
            "this silence is deafening."
        ),
        "speed": 0.82,
        "guidance_scale": 2.0,
    },
    # ── 3. LAUGHTER / হাসি ────────────────────────────────────────────────────
    {
        "tag": "laughter",
        "label": "😂 LAUGHTER (হাসি)",
        "text": (
            "Ha ha ha! Oh man, you should have seen the look on his face! "
            "I swear, I haven't laughed this hard in YEARS! "
            "He just stood there, completely frozen, with spaghetti all over his shirt! "
            "And then... and then the dog jumped on him! Ha ha ha! "
            "Oh god, my stomach hurts from laughing! "
            "I can't breathe! Someone stop, please! Ha ha ha!"
        ),
        "speed": 1.05,
        "guidance_scale": 2.0,
    },
    # ── 4. WHISPER / ফিসফিস ───────────────────────────────────────────────────
    {
        "tag": "whisper",
        "label": "🤫 WHISPER (ফিসফিস)",
        "text": (
            "Listen carefully... I'm only going to say this once. "
            "They're watching us. Don't turn around. Don't look at the window. "
            "Just keep walking, nice and slow, like nothing's wrong. "
            "There's a car waiting two blocks east. Silver sedan, engine running. "
            "When I say run... you run. And don't look back. "
            "No matter what you hear... don't... look... back."
        ),
        "speed": 0.78,
        "guidance_scale": 1.5,
    },
    # ── 5. SICK / অসুস্থ ──────────────────────────────────────────────────────
    {
        "tag": "sick",
        "label": "🤒 SICK (অসুস্থ)",
        "text": (
            "Ugh... I feel terrible. This cold is killing me. "
            "Can barely breathe through my nose... My throat is raw and scratchy. "
            "Every time I try to speak... it hurts. "
            "I've gone through like two boxes of tissues already. "
            "My head is pounding. My body aches everywhere. "
            "I just want to crawl into bed and not move for a week..."
        ),
        "speed": 0.88,
        "guidance_scale": 2.0,
    },
    # ── 6. HEROIC MONOLOGUE / বীরত্বপূর্ণ ────────────────────────────────────
    {
        "tag": "heroic",
        "label": "⚔️ HEROIC (বীরত্ব)",
        "text": (
            "The darkness does not scare me anymore. "
            "I have walked through fire... through war... through loss. "
            "And still... I stand. "
            "Because I am not built from hope alone. "
            "I am forged from pain, from rage, from the silence between heartbeats. "
            "They thought they could break me. They were wrong. "
            "I am the storm they never saw coming. "
            "And when I rise... the earth will tremble."
        ),
        "speed": 0.85,
        "guidance_scale": 2.5,
    },
    # ── 7. VILLAIN / খলনায়ক ──────────────────────────────────────────────────
    {
        "tag": "villain",
        "label": "🦹 VILLAIN (খলনায়ক)",
        "text": (
            "You really thought you could stop me? How... adorable. "
            "Let me explain something to you, hero. "
            "I have been planning this for fifteen years. Every move, every breath, "
            "every little accident that brought you here... was me. "
            "You are not the hunter. You never were. "
            "You are the mouse... and this maze? I built it. "
            "Now... shall we play one last game?"
        ),
        "speed": 0.90,
        "guidance_scale": 2.5,
    },
    # ── 8. ROMANTIC / রোমান্টিক ───────────────────────────────────────────────
    {
        "tag": "romantic",
        "label": "💕 ROMANTIC (রোমান্টিক)",
        "text": (
            "I don't know when it started. Maybe it was the way you laugh, "
            "the way your eyes light up when you talk about the things you love. "
            "Maybe it was that rainy Tuesday when you held my hand "
            "and didn't let go. I just know that... somewhere between "
            "all the chaos and the noise... I fell. Completely, hopelessly, "
            "irreversibly... in love with you. And I wouldn't change a single moment."
        ),
        "speed": 0.85,
        "guidance_scale": 2.0,
    },
    # ── 9. EPIC NARRATOR / মহাকাব্যিক বর্ণনা ─────────────────────────────────
    {
        "tag": "narrator",
        "label": "📖 NARRATOR (বর্ণনাকারী)",
        "text": (
            "In the year twenty-one forty-seven, humanity stood at the edge of extinction. "
            "The oceans had risen. The cities had fallen. "
            "And from the ashes of the old world, a new order emerged. "
            "They called themselves the Architects. They promised salvation. "
            "But salvation, as history has taught us, always comes with a price. "
            "This is the story of those who refused to pay it. "
            "This is the story... of the last rebellion."
        ),
        "speed": 0.88,
        "guidance_scale": 2.2,
    },
    # ── 10. MOTIVATIONAL / অনুপ্রেরণামূলক ────────────────────────────────────
    {
        "tag": "motivational",
        "label": "🚀 MOTIVATIONAL (অনুপ্রেরণা)",
        "text": (
            "Listen to me. I don't care how many times you've failed. "
            "I don't care how many people told you it's impossible. "
            "You are still here. You are still breathing. "
            "And that means you still have a chance. "
            "Every single champion, every legend, every person you admire... "
            "they all had a moment where they wanted to quit. "
            "The difference is... they didn't. So get up. Wipe the dust off. "
            "And show the world what you're made of."
        ),
        "speed": 0.92,
        "guidance_scale": 2.5,
    },
    # ── 11. BANGLA EMOTIONAL / বাংলা আবেগ ─────────────────────────────────────
    {
        "tag": "bangla_emotion",
        "label": "🇧🇩 BANGLA EMOTIONAL (বাংলা আবেগ)",
        "text": (
            "আম্মাজান! আপনি শুধু একটা বার নির্দেশ দেন, "
            "আজ পুরো পৃথিবীকে আমি আপনার পায়ের নিচে এনে হাজির করব! "
            "আমি জানি আমার জীবনে কত কষ্ট আছে, কত যন্ত্রণা আছে... "
            "কিন্তু আপনার একটা হাসি... সেটাই আমার সবচেয়ে বড় শক্তি। "
            "এই দুনিয়া আমাকে ভেঙে দিতে চেয়েছে বারবার... "
            "কিন্তু আপনার দোয়া আমাকে দাঁড় করিয়ে রেখেছে।"
        ),
        "speed": 0.88,
        "guidance_scale": 2.2,
    },
    # ── 12. HORROR / ভয়ংকর ────────────────────────────────────────────────────
    {
        "tag": "horror",
        "label": "👻 HORROR (ভয়ংকর)",
        "text": (
            "Do you hear that? That scratching sound... behind the wall. "
            "It's been going on for three nights now. Always at exactly three fifteen. "
            "I told myself it was rats. I told myself it was the pipes. "
            "But then last night... last night, it whispered my name. "
            "And when I pressed my ear against the wall... "
            "I felt something press back."
        ),
        "speed": 0.80,
        "guidance_scale": 1.8,
    },
]


# =============================================================================
# 🚀 MAIN EXECUTION
# =============================================================================
if __name__ == "__main__":
    total_start = time.time()
    total_files = len(EMOTION_SCRIPTS) * len(ALL_VOICES)

    print("=" * 75)
    print("🎭  ULTIMATE VOICE & EMOTION SHOWCASE  —  V5")
    print("=" * 75)
    print(f"📊  Voices : {len(ALL_VOICES)}  →  {', '.join(ALL_VOICES)}")
    print(f"🎬  Emotions: {len(EMOTION_SCRIPTS)}")
    print(f"📁  Total Files: {total_files}")
    print(f"📂  Output Dir : {BASE_OUTPUT_DIR}")
    print("=" * 75)

    generated = 0
    failed = 0

    for emo in EMOTION_SCRIPTS:
        print(f"\n{'─' * 70}")
        print(f"  {emo['label']}")
        print(f"{'─' * 70}")
        print(f"  📝 \"{emo['text'][:80]}...\"")
        print(f"  ⚙️  speed={emo['speed']}  guidance={emo['guidance_scale']}")
        print()

        for voice in ALL_VOICES:
            filename = f"v5_{emo['tag']}_{voice}.wav"
            output_path = os.path.join(BASE_OUTPUT_DIR, emo["tag"], filename)

            gen(
                text=emo["text"],
                voice=voice,
                model="tts-1-hd",
                output_path=output_path,
                speed=emo["speed"],
                num_step=32,
                guidance_scale=emo["guidance_scale"],
            )
            generated += 1

    # ─── Summary ──────────────────────────────────────────────────────────────
    total_time = time.time() - total_start
    print(f"\n{'=' * 75}")
    print(f"🎉  GENERATION COMPLETE!")
    print(f"{'=' * 75}")
    print(f"  ✅ Generated : {generated} files")
    print(f"  ⏱️  Total Time: {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"  📂 Output    : {BASE_OUTPUT_DIR}")
    print(f"{'=' * 75}")

    # ─── File listing ─────────────────────────────────────────────────────────
    print("\n📂 Generated File Tree:")
    for root, dirs, files in os.walk(BASE_OUTPUT_DIR):
        level = root.replace(BASE_OUTPUT_DIR, "").count(os.sep)
        indent = "  " * level
        folder = os.path.basename(root)
        print(f"  {indent}📁 {folder}/")
        for f in sorted(files):
            fpath = os.path.join(root, f)
            size_kb = os.path.getsize(fpath) // 1024
            print(f"  {indent}  🎵 {f} ({size_kb} KB)")
