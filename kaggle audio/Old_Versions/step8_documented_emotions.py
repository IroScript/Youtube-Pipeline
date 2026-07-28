# =============================================================================
# 🎭 VERSION 8: DOCUMENTATION-CORRECT EMOTIONAL TTS
# =============================================================================
# OmniVoice docs/expressive-speech.md (Jul 20, 2026) অনুযায়ী সঠিক approach:
#
# ✅ প্রতিটা emotional beat = আলাদা API call (carryover বন্ধ)
# ✅ শুধু documented tags: [laughter], [sigh], [pause], [breath]
# ✅ Punctuation = prosody control (documented)
# ✅ class_temperature দিয়ে expressive variation
# ✅ postprocess_output OFF = silence/breath preserved
# ✅ আলাদা segments → WAV concatenate → একটি ফাইনাল ফাইল
#
# ❌ CAPS = চেঁচানো (undocumented, কাজ করে না)
# ❌ [cry], [whisper], [trembling] (unsupported, noise আসে)
# ❌ পুরো স্ক্রিপ্ট এক call-এ (emotion carryover হয়)
#
# Kaggle নোটবুকে নতুন সেলে পেস্ট করে রান করুন।
# =============================================================================

import os, time, json, urllib.request, struct, wave, io

BASE_OUTPUT_DIR = "/kaggle/working/outputs/v8_documented_emotions"
API_URL = "http://localhost:3900/v1/audio/speech"


# ─── WAV Concatenation Helper ────────────────────────────────────────────────
def concat_wavs(wav_paths, output_path):
    """একাধিক WAV ফাইল জোড়া লাগিয়ে একটি ফাইনাল WAV তৈরি করে।"""
    params_set = False
    all_frames = b""

    for wp in wav_paths:
        if not os.path.exists(wp):
            continue
        with wave.open(wp, "rb") as wf:
            if not params_set:
                params = wf.getparams()
                params_set = True
            all_frames += wf.readframes(wf.getnframes())

    if not params_set:
        print("  ❌ কোনো WAV ফাইল পাওয়া যায়নি!")
        return

    with wave.open(output_path, "wb") as out:
        out.setparams(params)
        out.writeframes(all_frames)

    kb = os.path.getsize(output_path) // 1024
    print(f"  🎬 FINAL: {os.path.basename(output_path)} ({kb} KB)")


# ─── Silence Generator ───────────────────────────────────────────────────────
def make_silence_wav(duration_ms, output_path, sample_rate=22050, channels=1, sampwidth=2):
    """নির্দিষ্ট সময়ের নীরবতা WAV ফাইল হিসেবে তৈরি করে।"""
    num_samples = int(sample_rate * duration_ms / 1000)
    silence = b"\x00\x00" * num_samples * channels
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sampwidth)
        wf.setframerate(sample_rate)
        wf.writeframes(silence)


# ─── Generation Helper ───────────────────────────────────────────────────────
def gen_segment(text, voice="onyx", model="tts-1-hd", output_path="",
                speed=1.0, num_step=32, guidance_scale=2.0,
                class_temperature=0.0, postprocess_output=True,
                instruct=None, seed=None):
    """একটি সেগমেন্ট জেনারেট করে। প্রতিটা beat আলাদা call।"""
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

    # Documented Production Overrides
    if class_temperature > 0:
        payload["class_temperature"] = class_temperature
    if not postprocess_output:
        payload["postprocess_output"] = False
    if instruct:
        payload["instruct"] = instruct
    if seed is not None:
        payload["seed"] = seed

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
            tag = os.path.basename(output_path).replace(".wav", "")
            print(f"  ✅ {tag:40s} │ {kb:5d} KB │ {dur:4.1f}s")
            return True
    except Exception as e:
        print(f"  ❌ {os.path.basename(output_path)}: {e}")
        return False


# =============================================================================
# ✏️ আপনার স্ক্রিপ্ট এখানে — সেগমেন্ট আকারে
# =============================================================================
# 📖 প্রতিটা emotional beat = একটা আলাদা সেগমেন্ট
#
# 📋 DOCUMENTED TAGS (শুধু এগুলো কাজ করে):
#    [laughter]     → হাসি
#    [sigh]         → দীর্ঘশ্বাস
#    [breath]       → শ্বাস নেওয়ার শব্দ
#    [pause]        → 350ms default silence
#    [pause 500ms]  → নির্দিষ্ট সময়ের silence
#    [pause 1.5s]   → ১০ সেকেন্ড পর্যন্ত
#
# ⚙️ SETTINGS:
#    speed          → 0.78-1.05 (ধীর-দ্রুত)
#    guidance_scale → 1.5-3.0 (শান্ত-চরম আবেগ)
#    class_temperature → 0.0-0.7 (greedy → more "human" edges)
#    postprocess_output → False = silence/breath preserved (sad segments-এ)
#
# ❌ যা ব্যবহার করবেন না:
#    [cry], [whisper], [trembling], [excited] → unsupported, noise আসবে
#    CAPS দিয়ে চেঁচানো → documented নয়
# =============================================================================

VOICE = "onyx"          # মেল ভয়েস: "onyx" (গভীর), "echo" (মধ্যম), "alloy" (হালকা)
FILENAME = "v8_final"   # আউটপুট ফাইলের নাম

SEGMENTS = [
    # ─── EXAMPLE SCRIPT: "The Parallel Universe Bridge" ───────────────────
    # এটা একটা উদাহরণ। আপনার নিজের স্ক্রিপ্ট দিয়ে রিপ্লেস করুন।
    # প্রতিটা সেগমেন্ট আলাদা API call-এ যাবে → emotion carryover হবে না।
    # ──────────────────────────────────────────────────────────────────────

    # 1. NARRATOR — উত্তেজনা, anticipation
    {
        "tag": "01_narrator_opening",
        "text": (
            "What if the greatest invention in human history... "
            "wasn't a machine that traveled through space — "
            "but one that crossed possibilities?"
        ),
        "speed": 0.95,
        "guidance_scale": 2.2,
        "class_temperature": 0.3,
    },

    # --- 500ms pause ---
    {"tag": "pause_1", "silence_ms": 500},

    # 2. LAUGHTER + DOUBT — হাসি, সন্দেহ
    {
        "tag": "02_doubt_laughter",
        "text": (
            "[laughter] Another universe? Seriously? [laughter] "
            "Scientists kept working. Everyone else kept doubting."
        ),
        "speed": 1.05,
        "guidance_scale": 2.0,
        "class_temperature": 0.2,
    },

    # --- 400ms pause ---
    {"tag": "pause_2", "silence_ms": 400},

    # 3. EXCITEMENT — বিস্ময়, উত্তেজনা
    {
        "tag": "03_excitement_discovery",
        "text": (
            "And suddenly — the impossible became real! "
            "We saw dinosaurs, still walking, beneath blood-red skies! "
            "We found another Earth where humanity was born on Mars!"
        ),
        "speed": 1.05,
        "guidance_scale": 2.5,
        "class_temperature": 0.4,
    },

    # --- 800ms pause (mood shift) ---
    {"tag": "pause_3", "silence_ms": 800},

    # 4. PERSONAL SHIFT — ধীর, ব্যক্তিগত
    {
        "tag": "04_personal_shift",
        "text": (
            "But me? [pause 800ms] No. None of those worlds mattered. "
            "Not one. [pause 500ms] I was searching... for someone."
        ),
        "speed": 0.85,
        "guidance_scale": 2.0,
        "class_temperature": 0.2,
        "postprocess_output": False,
    },

    # --- 600ms pause ---
    {"tag": "pause_4", "silence_ms": 600},

    # 5. GRIEF — কষ্ট, ক্যান্সারের কথা
    {
        "tag": "05_grief_cancer",
        "text": (
            "Three years ago... cancer... stole my mother. "
            "[pause 1s] No warning. No mercy. No second chance."
        ),
        "speed": 0.80,
        "guidance_scale": 2.0,
        "class_temperature": 0.3,
        "postprocess_output": False,
    },

    # --- 800ms pause ---
    {"tag": "pause_5", "silence_ms": 800},

    # 6. DEEP SADNESS — গভীর কান্না, হাসপাতালের দৃশ্য
    {
        "tag": "06_hospital_memory",
        "text": (
            "[sigh] I watched the hospital monitor... become... silent. "
            "[pause 1.5s] I held her hand — hoping — just hoping — "
            "she'd squeeze mine one... last... time. "
            "[pause 2s] She never did."
        ),
        "speed": 0.78,
        "guidance_scale": 2.0,
        "class_temperature": 0.4,
        "postprocess_output": False,
    },

    # --- 1000ms pause (heavy moment) ---
    {"tag": "pause_6", "silence_ms": 1000},

    # 7. PAIN + FRUSTRATION — কষ্ট মেশানো রাগ
    {
        "tag": "07_pain_frustration",
        "text": (
            "I know she'll never answer. I know that! "
            "[pause 500ms] But I still call. [pause 800ms] "
            "Because sometimes... hope hurts more than reality."
        ),
        "speed": 0.82,
        "guidance_scale": 2.5,
        "class_temperature": 0.5,
    },

    # --- 800ms pause ---
    {"tag": "pause_7", "silence_ms": 800},

    # 8. QUIET PLEA — ফিসফিস-মতো অনুরোধ
    {
        "tag": "08_quiet_plea",
        "text": (
            "[breath] Listen. [pause 500ms] "
            "Take me to the universe... where my mother... never died."
        ),
        "speed": 0.80,
        "guidance_scale": 1.5,
        "class_temperature": 0.2,
        "postprocess_output": False,
    },

    # --- 1200ms pause (universe jump) ---
    {"tag": "pause_8", "silence_ms": 1200},

    # 9. WARMTH + RELIEF — উষ্ণতা, মাকে দেখে স্বস্তি
    {
        "tag": "09_warmth_relief",
        "text": (
            "There she was. [pause 500ms] Alive. Smiling. "
            "Making breakfast. Humming the exact same song she used to sing... "
            "every Sunday morning."
        ),
        "speed": 0.88,
        "guidance_scale": 2.2,
        "class_temperature": 0.3,
    },

    # --- 800ms pause ---
    {"tag": "pause_9", "silence_ms": 800},

    # 10. BITTERSWEET ENDING — তিক্ত-মধুর শেষ
    {
        "tag": "10_bittersweet_ending",
        "text": (
            "[pause 1s] She didn't know I wasn't her son. "
            "[pause 800ms] I was a broken man... "
            "borrowing someone else's miracle."
        ),
        "speed": 0.82,
        "guidance_scale": 2.0,
        "class_temperature": 0.3,
        "postprocess_output": False,
    },
]


# =============================================================================
# 🚀 GENERATE ALL SEGMENTS → CONCATENATE → ONE FINAL FILE
# =============================================================================
total_start = time.time()
seg_dir = os.path.join(BASE_OUTPUT_DIR, "_segments")
os.makedirs(seg_dir, exist_ok=True)

segment_count = len([s for s in SEGMENTS if "text" in s])
pause_count = len([s for s in SEGMENTS if "silence_ms" in s])

print("=" * 70)
print("🎭  VERSION 8 — DOCUMENTATION-CORRECT EMOTIONAL TTS")
print("=" * 70)
print(f"🎙️  Voice     : {VOICE}")
print(f"🎬  Segments  : {segment_count} speech + {pause_count} pauses")
print(f"📂  Output    : {BASE_OUTPUT_DIR}")
print("=" * 70)
print()
print("📖 Approach: প্রতিটা emotional beat = আলাদা API call")
print("   → emotion carryover হবে না")
print("   → সবশেষে WAV concatenate হয়ে একটি ফাইনাল ফাইল হবে")
print()

wav_order = []
generated = 0
failed = 0

for i, seg in enumerate(SEGMENTS):
    tag = seg["tag"]
    wav_path = os.path.join(seg_dir, f"{tag}.wav")

    # Silence segment
    if "silence_ms" in seg:
        make_silence_wav(seg["silence_ms"], wav_path)
        wav_order.append(wav_path)
        print(f"  ⏸️  {tag:40s} │ {seg['silence_ms']}ms silence")
        continue

    # Speech segment
    success = gen_segment(
        text=seg["text"],
        voice=VOICE,
        model="tts-1-hd",
        output_path=wav_path,
        speed=seg.get("speed", 0.88),
        num_step=32,
        guidance_scale=seg.get("guidance_scale", 2.0),
        class_temperature=seg.get("class_temperature", 0.0),
        postprocess_output=seg.get("postprocess_output", True),
        instruct=seg.get("instruct"),
        seed=seg.get("seed"),
    )

    if success:
        wav_order.append(wav_path)
        generated += 1
    else:
        failed += 1

# ─── Concatenate all segments into final file ─────────────────────────────
print(f"\n{'─' * 70}")
print("🔗 Concatenating all segments...")

final_path = os.path.join(BASE_OUTPUT_DIR, f"{FILENAME}_{VOICE}.wav")
concat_wavs(wav_order, final_path)

# ─── Summary ──────────────────────────────────────────────────────────────
total_time = time.time() - total_start
print(f"\n{'=' * 70}")
print(f"🎉  VERSION 8 — GENERATION COMPLETE!")
print(f"{'=' * 70}")
print(f"  ✅ Generated : {generated} segments")
if failed:
    print(f"  ❌ Failed    : {failed} segments")
print(f"  ⏱️  Total Time: {total_time:.1f}s ({total_time/60:.1f} min)")
print(f"  📁 Final File: {final_path}")
print(f"{'=' * 70}")
print()
print("📋 Segments breakdown:")
for seg in SEGMENTS:
    if "silence_ms" in seg:
        print(f"   ⏸️  {seg['tag']:30s} — {seg['silence_ms']}ms silence")
    else:
        emo = seg['tag'].split('_', 1)[1] if '_' in seg['tag'] else seg['tag']
        print(f"   🎤 {seg['tag']:30s} — speed={seg.get('speed',0.88)} "
              f"guide={seg.get('guidance_scale',2.0)} "
              f"temp={seg.get('class_temperature',0.0)}")
print(f"{'=' * 70}")

# =============================================================================
# 📥 DIRECT DOWNLOAD BUTTON (404-proof)
# =============================================================================
import base64
from IPython.display import HTML, display

if os.path.exists(final_path):
    with open(final_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    dl_name = os.path.basename(final_path)
    html = f'''<a download="{dl_name}" href="data:audio/wav;base64,{b64}">
    <button style="padding:14px 28px; background:linear-gradient(135deg,#667eea,#764ba2);
    color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;
    font-size:16px; margin:10px 0;">
    ⬇️ Download {dl_name}
    </button></a>'''
    print("\n⬇️  নিচের বাটনে ক্লিক করে সরাসরি ডাউনলোড করুন:")
    display(HTML(html))
else:
    print("\n❌ ফাইল তৈরি হয়নি — উপরের error চেক করুন।")
