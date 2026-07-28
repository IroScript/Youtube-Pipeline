# =============================================================================
# 🎭 V8.4 — SINGLE CHARACTER, MALE ONLY, NO TAGS SPOKEN
# =============================================================================
# Fix 1: Multiple characters → একই voice + consistent speed/temp
# Fix 2: Cancer part excited → grief-tuned settings
# Fix 3: [pause] spoken aloud → সব tag বাদ, শুধু punctuation
# Fix 4: Studio dir auto-detect + base64 download
# =============================================================================

import os, time, json, urllib.request, wave, subprocess, base64
from IPython.display import HTML, display

BASE_OUTPUT_DIR = "/kaggle/working/outputs/v8_4_single_char"
API_URL = "http://localhost:3900/v1/audio/speech"
HEALTH_URL = "http://localhost:3900/health"

# ═════════════════════════════════════════════════════════════════════════════
# 🔧 SERVER CHECK
# ═════════════════════════════════════════════════════════════════════════════
def server_alive():
    try:
        with urllib.request.urlopen(urllib.request.Request(HEALTH_URL), timeout=5) as r:
            return r.status == 200
    except:
        return False

def find_studio_dir():
    for root, dirs, files in os.walk("/kaggle/working"):
        if "backend" in dirs and os.path.exists(os.path.join(root, "backend", "main.py")):
            return root
    return None

def start_server():
    studio = find_studio_dir()
    if not studio:
        print("  ❌ OmniVoice Studio পাওয়া যায়নি! Step 2 আগে রান করুন।")
        return False
    print(f"  📂 {studio}")
    log_file = open("/tmp/omnivoice.log", "w")
    subprocess.Popen(["uv", "run", "python", "backend/main.py"],
                     stdout=log_file, stderr=log_file, cwd=studio)
    for i in range(30):
        time.sleep(2)
        if server_alive():
            print(f"  ✅ Server ready! ({(i+1)*2}s)")
            return True
        if i % 5 == 4:
            print(f"  ⏳ Waiting... ({(i+1)*2}s)")
    print("  ❌ Failed! Run: !cat /tmp/omnivoice.log")
    return False

print("=" * 70)
print("🔧 SERVER CHECK")
print("=" * 70)
if server_alive():
    print("  ✅ Server running")
else:
    print("  ⚠️  Restarting...")
    if not start_server():
        raise RuntimeError("Server failed. Run Step 2 & 3 first.")
print()

# ═════════════════════════════════════════════════════════════════════════════
# 🎵 FUNCTIONS
# ═════════════════════════════════════════════════════════════════════════════
def concat_wavs(wav_paths, output_path):
    params_set = False
    all_frames = b""
    for wp in wav_paths:
        if not os.path.exists(wp): continue
        with wave.open(wp, "rb") as wf:
            if not params_set:
                params = wf.getparams()
                params_set = True
            all_frames += wf.readframes(wf.getnframes())
    if not params_set:
        print("  ❌ No WAV files!")
        return None
    with wave.open(output_path, "wb") as out:
        out.setparams(params)
        out.writeframes(all_frames)
    kb = os.path.getsize(output_path) // 1024
    dur = len(all_frames) / (params.framerate * params.sampwidth * params.nchannels)
    print(f"  🎬 FINAL: {os.path.basename(output_path)} ({kb} KB, {dur:.1f}s)")
    return output_path

def gen_segment(text, voice, output_path, speed=0.88, guidance_scale=2.0,
                class_temperature=0.3, postprocess_output=True):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    payload = {
        "model": "tts-1-hd", "voice": voice, "input": text,
        "response_format": "wav", "speed": speed,
        "num_step": 32, "guidance_scale": guidance_scale,
    }
    if class_temperature > 0:
        payload["class_temperature"] = class_temperature
    if not postprocess_output:
        payload["postprocess_output"] = False
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data,
                                headers={"Content-Type": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            content = resp.read()
            with open(output_path, "wb") as f:
                f.write(content)
            tag = os.path.basename(output_path).replace(".wav", "")
            print(f"  ✅ {tag:40s} │ {len(content)//1024:5d} KB │ {time.time()-t0:4.1f}s")
            return True
    except Exception as e:
        print(f"  ❌ {os.path.basename(output_path)}: {e}")
        return False

def make_silence(ms, path, sr=22050):
    n = int(sr * ms / 1000)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(b"\x00\x00" * n)

# ═════════════════════════════════════════════════════════════════════════════
# 🎬 SCRIPT — SINGLE CHARACTER, NO TAGS, PUNCTUATION ONLY
# ═════════════════════════════════════════════════════════════════════════════
# ❌ কোনো [pause], [sigh], [breath], [laughter] নেই — engine বলে ফেলে
# ✅ শুধু ... — ! ? এবং ছোট fragments দিয়ে pacing
# ✅ একটাই voice, একটাই character, narrow speed range (0.82-0.92)
# ✅ একটাই class_temperature (0.3) — voice consistency
# ═════════════════════════════════════════════════════════════════════════════

VOICE = "onyx"
FILENAME = "v8_4_single_character"

SEGMENTS = [
    # ── 01: Opening — calm, intrigued narrator ──
    {
        "tag": "01_opening",
        "text": (
            "What if the greatest invention in human history... "
            "wasn't a machine that traveled through space — "
            "but one that crossed possibilities?"
        ),
        "speed": 0.90,
        "guidance_scale": 2.2,
    },
    {"silence_ms": 400},

    # ── 02: Doubt — light, slightly amused ──
    {
        "tag": "02_doubt",
        "text": (
            "Another universe? Seriously? "
            "Scientists kept working. Everyone else kept doubting."
        ),
        "speed": 0.92,
        "guidance_scale": 2.0,
    },
    {"silence_ms": 300},

    # ── 03: Wonder — building energy, but same voice ──
    {
        "tag": "03_wonder",
        "text": (
            "And suddenly — the impossible became real. "
            "We saw dinosaurs, still walking, beneath blood-red skies. "
            "We found another Earth where humanity was born on Mars."
        ),
        "speed": 0.90,
        "guidance_scale": 2.2,
    },
    {"silence_ms": 600},

    # ── 04: Shift — tone drops, personal ──
    {
        "tag": "04_shift",
        "text": (
            "But me... "
            "no. None of those worlds mattered. Not one. "
            "I was searching... for someone."
        ),
        "speed": 0.85,
        "guidance_scale": 2.0,
    },
    {"silence_ms": 800},

    # ── 05: Grief — slow, heavy, weight in every word ──
    {
        "tag": "05_grief",
        "text": (
            "Three years ago... cancer... stole my mother. "
            "No warning. No mercy. No second chance."
        ),
        "speed": 0.82,
        "guidance_scale": 1.8,
        "postprocess_output": False,
    },
    {"silence_ms": 1000},

    # ── 06: Hospital — deepest sadness, fragments ──
    {
        "tag": "06_hospital",
        "text": (
            "I watched the hospital monitor... become... silent. "
            "I held her hand — hoping — just hoping — "
            "she'd squeeze mine... one... last... time."
        ),
        "speed": 0.82,
        "guidance_scale": 1.8,
        "postprocess_output": False,
    },
    {"silence_ms": 1500},

    # ── 07: She never did — separate for weight ──
    {
        "tag": "07_she_never_did",
        "text": "She never did.",
        "speed": 0.82,
        "guidance_scale": 1.8,
        "postprocess_output": False,
    },
    {"silence_ms": 1000},

    # ── 08: Pain — frustration leaking through grief ──
    {
        "tag": "08_pain",
        "text": (
            "I know she'll never answer. I know that. "
            "But I still call. "
            "Because sometimes... hope hurts more than reality."
        ),
        "speed": 0.85,
        "guidance_scale": 2.2,
    },
    {"silence_ms": 800},

    # ── 09: Plea — quiet, desperate request ──
    {
        "tag": "09_plea",
        "text": (
            "Listen. "
            "Take me to the universe... where my mother... never died."
        ),
        "speed": 0.82,
        "guidance_scale": 1.8,
        "postprocess_output": False,
    },
    {"silence_ms": 1200},

    # ── 10: Warmth — relief, but restrained ──
    {
        "tag": "10_warmth",
        "text": (
            "There she was. Alive. Smiling. Making breakfast. "
            "Humming the exact same song she used to sing... "
            "every Sunday morning."
        ),
        "speed": 0.88,
        "guidance_scale": 2.0,
    },
    {"silence_ms": 1000},

    # ── 11: Ending — bittersweet, soft ──
    {
        "tag": "11_ending",
        "text": (
            "She didn't know I wasn't her son. "
            "I was a broken man... "
            "borrowing someone else's miracle."
        ),
        "speed": 0.85,
        "guidance_scale": 2.0,
        "postprocess_output": False,
    },
]

# ═════════════════════════════════════════════════════════════════════════════
# 🚀 GENERATE → CONCATENATE → DOWNLOAD
# ═════════════════════════════════════════════════════════════════════════════
total_start = time.time()
seg_dir = os.path.join(BASE_OUTPUT_DIR, "segments")
os.makedirs(seg_dir, exist_ok=True)

speech_segs = [s for s in SEGMENTS if "text" in s]

print("=" * 70)
print("🎭  V8.4 — SINGLE CHARACTER, MALE ONLY")
print("=" * 70)
print(f"🎙️  Voice      : {VOICE} (onyx — deep male)")
print(f"🎬  Segments   : {len(speech_segs)} speech")
print(f"🚫  Tags       : NONE (no [pause], [sigh], [breath])")
print(f"✅  Pacing     : ... — ! fragments only")
print(f"📂  Output     : {BASE_OUTPUT_DIR}")
print("=" * 70)
print()

wav_order = []
generated = 0
failed = []
sil_idx = 0

for seg in SEGMENTS:
    # Silence
    if "silence_ms" in seg:
        sil_path = os.path.join(seg_dir, f"sil_{sil_idx:02d}.wav")
        make_silence(seg["silence_ms"], sil_path)
        wav_order.append(sil_path)
        sil_idx += 1
        continue

    # Speech
    tag = seg["tag"]
    wav_path = os.path.join(seg_dir, f"{tag}.wav")
    success = gen_segment(
        text=seg["text"],
        voice=VOICE,
        output_path=wav_path,
        speed=seg.get("speed", 0.88),
        guidance_scale=seg.get("guidance_scale", 2.0),
        class_temperature=0.3,  # FIXED: একই temp সব segments-এ
        postprocess_output=seg.get("postprocess_output", True),
    )
    if success:
        wav_order.append(wav_path)
        generated += 1
    else:
        failed.append(tag)

# ─── Concatenate ──────────────────────────────────────────────────────────
print(f"\n{'─' * 70}")
print("🔗 Concatenating...")
final_path = os.path.join(BASE_OUTPUT_DIR, f"{FILENAME}_{VOICE}.wav")
result = concat_wavs(wav_order, final_path)

total_time = time.time() - total_start
print(f"\n{'=' * 70}")
print(f"🎉  DONE! {generated}/{len(speech_segs)} segments → 1 file")
if failed:
    print(f"  ⚠️  Failed: {', '.join(failed)}")
print(f"  ⏱️  {total_time:.1f}s ({total_time/60:.1f} min)")
print(f"  📁 {final_path}")
print(f"{'=' * 70}")

# ═════════════════════════════════════════════════════════════════════════════
# 📥 DIRECT DOWNLOAD (base64 — no 404)
# ═════════════════════════════════════════════════════════════════════════════
if result and os.path.exists(final_path):
    with open(final_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    dl = os.path.basename(final_path)
    mb = os.path.getsize(final_path) / (1024*1024)
    html = f'''<a download="{dl}" href="data:audio/wav;base64,{b64}">
    <button style="padding:14px 28px; background:linear-gradient(135deg,#667eea,#764ba2);
    color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;
    font-size:16px; margin:10px 0;">
    ⬇️ Download {dl} ({mb:.1f} MB)
    </button></a>'''
    print(f"\n⬇️  নিচের বাটনে ক্লিক করুন:")
    display(HTML(html))
else:
    print("\n❌ ফাইল তৈরি হয়নি।")
