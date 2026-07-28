# =============================================================================
# 🎭 Step 4: V8.3 — ERROR-CORRECTED VERSION
# =============================================================================
# Fix 1: FileNotFoundError → cwd fallback + path auto-detect
# Fix 2: FileLink 404 → base64 download button
# Fix 3: Server restart → graceful fallback if already running
# =============================================================================

import os, time, json, urllib.request, wave, subprocess, base64
from IPython.display import HTML, display

BASE_OUTPUT_DIR = "/kaggle/working/outputs/v8_3_corrected"
API_URL = "http://localhost:3900/v1/audio/speech"
HEALTH_URL = "http://localhost:3900/health"

# ═════════════════════════════════════════════════════════════════════════════
# 🔧 SERVER AUTO-RESTART (ERROR-CORRECTED)
# ═════════════════════════════════════════════════════════════════════════════
def server_alive():
    try:
        req = urllib.request.Request(HEALTH_URL)
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except:
        return False

def find_studio_dir():
    """OmniVoice Studio ডিরেক্টরি অটো-ডিটেক্ট করে।"""
    candidates = [
        "/kaggle/working/omnivoice-studio",
        "/kaggle/working/OmniVoice-Studio",
        os.getcwd(),  # current dir (if %cd already ran)
    ]
    # os.walk দিয়ে খোঁজা (যদি অন্য নামে থাকে)
    for root, dirs, files in os.walk("/kaggle/working"):
        if "backend" in dirs and os.path.exists(os.path.join(root, "backend", "main.py")):
            candidates.insert(0, root)
            break
    for path in candidates:
        if os.path.exists(os.path.join(path, "backend", "main.py")):
            return path
    return None

def start_server():
    studio_dir = find_studio_dir()
    if not studio_dir:
        print("  ❌ OmniVoice Studio ফোল্ডার পাওয়া যায়নি!")
        print("     Step 2 (Clone & Install) সেলটি আগে রান করুন।")
        return False

    print(f"  📂 Studio Dir: {studio_dir}")
    print("  🔄 Starting server...")
    log_file = open("/tmp/omnivoice.log", "w")
    subprocess.Popen(
        ["uv", "run", "python", "backend/main.py"],
        stdout=log_file, stderr=log_file,
        cwd=studio_dir
    )
    for i in range(30):
        time.sleep(2)
        if server_alive():
            print(f"  ✅ Server ready! ({(i+1)*2}s)")
            return True
        if i % 5 == 4:
            print(f"  ⏳ Still waiting... ({(i+1)*2}s)")
    print("  ❌ Server failed! Check: !cat /tmp/omnivoice.log")
    return False

# ─── Check & Restart ──────────────────────────────────────────────────────
print("=" * 70)
print("🔧 SERVER CHECK")
print("=" * 70)

if server_alive():
    print("  ✅ Server already running on :3900")
else:
    print("  ⚠️  Server not responding — restarting...")
    if not start_server():
        raise RuntimeError("Server failed. Run Step 2 & 3 cells first.")

print()

# ═════════════════════════════════════════════════════════════════════════════
# 🎵 TTS FUNCTIONS
# ═════════════════════════════════════════════════════════════════════════════
def concat_wavs(wav_paths, output_path):
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
        print("  ❌ No WAV files found!")
        return None
    with wave.open(output_path, "wb") as out:
        out.setparams(params)
        out.writeframes(all_frames)
    kb = os.path.getsize(output_path) // 1024
    duration_s = len(all_frames) / (params.framerate * params.sampwidth * params.nchannels)
    print(f"  🎬 FINAL: {os.path.basename(output_path)} ({kb} KB, {duration_s:.1f}s audio)")
    return output_path

def gen_segment(text, voice="onyx", model="tts-1-hd", output_path="",
                speed=1.0, num_step=32, guidance_scale=2.0,
                class_temperature=0.0, postprocess_output=True, seed=None):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    payload = {
        "model": model, "voice": voice, "input": text,
        "response_format": "wav", "speed": speed,
        "num_step": num_step, "guidance_scale": guidance_scale,
    }
    if class_temperature > 0:
        payload["class_temperature"] = class_temperature
    if not postprocess_output:
        payload["postprocess_output"] = False
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

# ═════════════════════════════════════════════════════════════════════════════
# 📋 DOCUMENTED TAGS ONLY:
#    ✅ [laughter] [sigh] [breath] [pause] [pause 500ms] [pause 2s]
#    ✅ ... (ellipses) — (em dash) ! (exclamation) = prosody control
#    ❌ [cry] [whisper] [trembling] [excited] = unsupported
# ═════════════════════════════════════════════════════════════════════════════

VOICE = "onyx"
FILENAME = "v8_3_final"

SEGMENTS = [
    {
        "tag": "01_narrator_opening",
        "text": (
            "What if the greatest invention in human history... "
            "wasn't a machine that traveled through space — "
            "but one that crossed possibilities?"
        ),
        "speed": 0.95, "guidance_scale": 2.2, "class_temperature": 0.3,
    },
    {
        "tag": "02_doubt_laughter",
        "text": (
            "[laughter] Another universe? Seriously? [laughter] "
            "Scientists kept working. Everyone else kept doubting."
        ),
        "speed": 1.05, "guidance_scale": 2.0, "class_temperature": 0.2,
    },
    {
        "tag": "03_excitement",
        "text": (
            "And suddenly — the impossible became real! "
            "We saw dinosaurs, still walking, beneath blood-red skies! "
            "We found another Earth where humanity was born on Mars!"
        ),
        "speed": 1.05, "guidance_scale": 2.5, "class_temperature": 0.4,
    },
    {
        "tag": "04_personal_shift",
        "text": (
            "But me? "
            "No. None of those worlds mattered. Not one. "
            "I was searching... for someone."
        ),
        "speed": 0.85, "guidance_scale": 2.0, "class_temperature": 0.2,
        "postprocess_output": False,
    },
    {
        "tag": "05_grief",
        "text": (
            "Three years ago... cancer... stole my mother. "
            "No warning. No mercy. No second chance."
        ),
        "speed": 0.80, "guidance_scale": 2.0, "class_temperature": 0.3,
        "postprocess_output": False,
    },
    {
        "tag": "06_hospital_crying",
        "text": (
            "[sigh] "
            "I watched the hospital monitor... become... silent. "
            "I held her hand — hoping — just hoping — "
            "she'd squeeze mine... one... last... time. "
            "[pause 2s] "
            "She never did."
        ),
        "speed": 0.75, "guidance_scale": 1.8, "class_temperature": 0.45,
        "postprocess_output": False,
    },
    {
        "tag": "07_pain",
        "text": (
            "I know she'll never answer. I know that! "
            "But I still call. "
            "Because sometimes... hope hurts more than reality."
        ),
        "speed": 0.82, "guidance_scale": 2.5, "class_temperature": 0.5,
    },
    {
        "tag": "08_plea",
        "text": (
            "[breath] Listen. "
            "Take me to the universe... where my mother... never died."
        ),
        "speed": 0.80, "guidance_scale": 1.8, "class_temperature": 0.2,
        "postprocess_output": False,
    },
    {
        "tag": "09_warmth",
        "text": (
            "There she was. Alive. Smiling. Making breakfast. "
            "Humming the exact same song she used to sing... "
            "every Sunday morning."
        ),
        "speed": 0.88, "guidance_scale": 2.2, "class_temperature": 0.3,
    },
    {
        "tag": "10_ending",
        "text": (
            "[pause 1.5s] "
            "She didn't know I wasn't her son. "
            "I was a broken man... borrowing someone else's miracle."
        ),
        "speed": 0.82, "guidance_scale": 2.0, "class_temperature": 0.3,
        "postprocess_output": False,
    },
]

# ═════════════════════════════════════════════════════════════════════════════
# 🚀 GENERATE → CONCATENATE → DOWNLOAD
# ═════════════════════════════════════════════════════════════════════════════
total_start = time.time()
seg_dir = os.path.join(BASE_OUTPUT_DIR, "segments")
os.makedirs(seg_dir, exist_ok=True)

print("=" * 70)
print("🎭  VERSION 8.3 — ERROR-CORRECTED")
print("=" * 70)
print(f"🎙️  Voice     : {VOICE}")
print(f"🎬  Segments  : {len(SEGMENTS)}")
print(f"📂  Output    : {BASE_OUTPUT_DIR}")
print("=" * 70)
print()

wav_order = []
generated = 0
failed = []

for seg in SEGMENTS:
    tag = seg["tag"]
    wav_path = os.path.join(seg_dir, f"{tag}.wav")

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
        seed=seg.get("seed"),
    )
    if success:
        wav_order.append(wav_path)
        generated += 1
    else:
        failed.append(tag)

# ─── Concatenate ──────────────────────────────────────────────────────────
print(f"\n{'─' * 70}")
print("🔗 Concatenating all segments...")
final_path = os.path.join(BASE_OUTPUT_DIR, f"{FILENAME}_{VOICE}.wav")
result = concat_wavs(wav_order, final_path)

total_time = time.time() - total_start
print(f"\n{'=' * 70}")
print(f"🎉  DONE! {generated}/{len(SEGMENTS)} segments → 1 file")
if failed:
    print(f"  ⚠️  Failed: {', '.join(failed)}")
print(f"  ⏱️  {total_time:.1f}s ({total_time/60:.1f} min)")
print(f"  📁 {final_path}")
print(f"{'=' * 70}")

# ═════════════════════════════════════════════════════════════════════════════
# 📥 DIRECT DOWNLOAD BUTTON (base64 — 404-proof)
# ═════════════════════════════════════════════════════════════════════════════
if result and os.path.exists(final_path):
    with open(final_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    dl_name = os.path.basename(final_path)
    size_mb = os.path.getsize(final_path) / (1024 * 1024)
    html = f'''<a download="{dl_name}" href="data:audio/wav;base64,{b64}">
    <button style="padding:14px 28px; background:linear-gradient(135deg,#667eea,#764ba2);
    color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;
    font-size:16px; margin:10px 0;">
    ⬇️ Download {dl_name} ({size_mb:.1f} MB)
    </button></a>'''
    print(f"\n⬇️  নিচের বাটনে ক্লিক করে সরাসরি ডাউনলোড করুন:")
    display(HTML(html))
else:
    print("\n❌ ফাইল তৈরি হয়নি — উপরের error চেক করুন।")
