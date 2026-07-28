# =============================================================================
# 🎭 V8.6 — VOICE-LOCKED: Reference Audio Chaining
# =============================================================================
#
# 🔍 ROOT CAUSE (রিসার্চ থেকে):
# ─────────────────────────────
# seed শুধু *একই text*-এর জন্য reproducibility দেয়।
# ভিন্ন text input → ভিন্ন voice identity, seed যতই fix থাকুক।
# এটাই "multiple characters" সমস্যার আসল কারণ।
#
# ✅ SOLUTION: Reference Audio Chaining ("Anchor" Method)
# ──────────────────────────────────────────────────────
# 1. /v1/audio/speech/clone endpoint ব্যবহার করি (multipart/form-data)
# 2. প্রতিটা segment-এ একই reference audio পাঠাই
# 3. Reference audio = আপনার দেওয়া voice sample
#    অথবা প্রথম generated segment
# 4. OmniVoice সেই reference থেকে timbre+delivery clone করে
#    → সব segment একই গলা!
#
# 📖 Developer forums:
#    "Use your first generated audio as the reference_audio for the
#     next segment. Seeds only ensure reproducibility for identical
#     inputs; they do NOT lock a voice persona when text changes."
#
# 📖 OmniVoice docs:
#    "The reference clip is a performance direction. Zero-shot
#     cloning mirrors the delivery of the reference, not just timbre."
# =============================================================================

import os, time, json, urllib.request, wave, subprocess, base64, glob
from IPython.display import HTML, display

BASE_OUTPUT_DIR = "/kaggle/working/outputs/v8_6_voice_locked"
API_URL = "http://localhost:3900/v1/audio/speech"
CLONE_URL = "http://localhost:3900/v1/audio/speech/clone"
HEALTH_URL = "http://localhost:3900/health"
VOICES_URL = "http://localhost:3900/v1/audio/voices"

# ═════════════════════════════════════════════════════════════════════════════
# ⚙️ CONFIGURATION
# ═════════════════════════════════════════════════════════════════════════════

# ─── আপনার ভয়েস sample (৩-১০ সেকেন্ড, পরিষ্কার, একজনের গলা) ────────────
# Kaggle-এ dataset হিসেবে আপলোড করুন
# দিতে না চাইলে None রাখুন — তখন preset voice দিয়ে প্রথম segment generate
# হবে, তারপর সেটাই reference হিসেবে ব্যবহার হবে
CUSTOM_VOICE_PATH = "/kaggle/input/sample-voice/njk-nyntrnr-upy_S4kV3QyM.mp3"

# ─── Fallback preset voice (শুধু প্রথম segment-এর জন্য, যদি custom না দেন) ─
PRESET_VOICE = "onyx"

# ─── Common settings ──────────────────────────────────────────────────────
SEED = 42
FILENAME = "v8_6_voice_locked"

# ═════════════════════════════════════════════════════════════════════════════
# 🔍 AUTO-DISCOVER: ভয়েস ফাইল খুঁজে বের করা
# ═════════════════════════════════════════════════════════════════════════════
def auto_discover_voice(given_path):
    """যদি দেওয়া পাথে ফাইল না থাকে, /kaggle/input/ এ সব audio file খুঁজে দেখায়"""
    if given_path and os.path.exists(given_path):
        return given_path
    if not given_path:
        return None

    print(f"  ⚠️ দেওয়া পাথে ফাইল নেই: {given_path}")
    print(f"  🔍 /kaggle/input/ এ অডিও ফাইল খুঁজছি...")

    audio_files = []
    search_root = "/kaggle/input"
    if os.path.exists(search_root):
        for root, dirs, files in os.walk(search_root):
            for f in files:
                if f.lower().endswith((".mp3", ".wav", ".flac", ".ogg", ".m4a")):
                    audio_files.append(os.path.join(root, f))

    if not audio_files:
        print(f"  ❌ কোনো অডিও ফাইল পাওয়া যায়নি /kaggle/input/ এ")
        return None

    print(f"  📋 পাওয়া গেছে {len(audio_files)} টি অডিও ফাইল:")
    for i, af in enumerate(audio_files):
        size_kb = os.path.getsize(af) // 1024
        print(f"     {i+1}. {af} ({size_kb} KB)")

    chosen = audio_files[0]
    print(f"  ✅ ব্যবহার করা হচ্ছে: {chosen}")
    return chosen

CUSTOM_VOICE_PATH = auto_discover_voice(CUSTOM_VOICE_PATH)

# ═════════════════════════════════════════════════════════════════════════════
# 📁 AUTO-VERSIONING
# ═════════════════════════════════════════════════════════════════════════════
def get_next_version(base_dir, base_name):
    """existing ফাইল চেক করে পরবর্তী version number বের করে"""
    os.makedirs(base_dir, exist_ok=True)
    version = 1
    while True:
        candidate = os.path.join(base_dir, f"{base_name}_v{version}.wav")
        if not os.path.exists(candidate):
            return version, candidate
        version += 1

RUN_VERSION, FINAL_OUTPUT_PATH = get_next_version(BASE_OUTPUT_DIR, FILENAME)
print(f"📁 Auto-version: v{RUN_VERSION} (নতুন ফাইল: {os.path.basename(FINAL_OUTPUT_PATH)})")
print()

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
# 🔍 ENDPOINT DISCOVERY: সার্ভারে কোন endpoints আছে খুঁজে বের করি
# ═════════════════════════════════════════════════════════════════════════════
def discover_clone_endpoint():
    """
    সার্ভারে /v1/audio/speech/clone endpoint আছে কিনা চেক করি।
    না থাকলে বিকল্প endpoint খুঁজি।
    """
    # প্রথমে OpenAPI spec থেকে সব routes বের করি
    try:
        req = urllib.request.Request("http://localhost:3900/openapi.json")
        with urllib.request.urlopen(req, timeout=10) as resp:
            spec = json.loads(resp.read().decode())
            paths = spec.get("paths", {})

            print("  📋 সার্ভারের Audio API Routes:")
            clone_endpoint = None
            speech_schema = None

            for path, methods in sorted(paths.items()):
                if "audio" in path or "speech" in path or "voice" in path:
                    for method in methods:
                        if method in ("get", "post", "put", "delete"):
                            print(f"     {method.upper():6s} {path}")
                            if "clone" in path and method == "post":
                                clone_endpoint = path

            # Speech endpoint-এর schema দেখি — ref_audio আছে কিনা
            speech_path = paths.get("/v1/audio/speech", {})
            if "post" in speech_path:
                post_spec = speech_path["post"]
                body = post_spec.get("requestBody", {}).get("content", {})
                for content_type, schema_info in body.items():
                    print(f"\n  📖 /v1/audio/speech accepts: {content_type}")
                    # multipart/form-data accept করলে ref_audio পাঠানো যাবে
                    if "multipart" in content_type:
                        print("     ✅ multipart/form-data সাপোর্ট করে!")
                        return "/v1/audio/speech", "multipart"

            # schema components থেকে speech params খুঁজি
            schemas = spec.get("components", {}).get("schemas", {})
            for name, schema in schemas.items():
                if "speech" in name.lower() or "tts" in name.lower() or "clone" in name.lower():
                    props = schema.get("properties", {})
                    print(f"\n  📖 Schema '{name}' properties:")
                    for prop_name, prop_val in props.items():
                        print(f"     • {prop_name}: {prop_val.get('type', 'N/A')}")

            if clone_endpoint:
                return clone_endpoint, "clone"
            return None, None

    except Exception as e:
        print(f"  ⚠️ OpenAPI spec পড়া যায়নি: {e}")
        return None, None

print("=" * 70)
print("🔍 ENDPOINT DISCOVERY")
print("=" * 70)
clone_ep, clone_mode = discover_clone_endpoint()
print()

# ═════════════════════════════════════════════════════════════════════════════
# 🎵 CORE FUNCTIONS
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

def make_silence(ms, path, sr=22050):
    n = int(sr * ms / 1000)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(b"\x00\x00" * n)

def gen_with_clone(text, ref_audio_path, output_path, speed=0.88,
                   guidance_scale=2.0, seed=42, ref_text=""):
    """
    🎯 /v1/audio/speech/clone endpoint — multipart/form-data
    প্রতিটা API call-এ reference audio পাঠায়।
    এতে voice identity locked থাকে।
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    boundary = "----OmniVoiceClone" + str(int(time.time() * 1000))
    body = b""

    # text field
    body += f"--{boundary}\r\n".encode()
    body += b"Content-Disposition: form-data; name=\"text\"\r\n\r\n"
    body += f"{text}\r\n".encode()

    # speed field
    body += f"--{boundary}\r\n".encode()
    body += b"Content-Disposition: form-data; name=\"speed\"\r\n\r\n"
    body += f"{speed}\r\n".encode()

    # ref_text field (optional — না দিলে Whisper auto-transcribe করবে)
    if ref_text:
        body += f"--{boundary}\r\n".encode()
        body += b"Content-Disposition: form-data; name=\"ref_text\"\r\n\r\n"
        body += f"{ref_text}\r\n".encode()

    # ref_audio file
    filename = os.path.basename(ref_audio_path)
    ext = os.path.splitext(filename)[1].lower()
    mime = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".flac": "audio/flac",
            ".ogg": "audio/ogg", ".m4a": "audio/mp4"}.get(ext, "audio/wav")

    body += f"--{boundary}\r\n".encode()
    body += f'Content-Disposition: form-data; name="ref_audio"; filename="{filename}"\r\n'.encode()
    body += f"Content-Type: {mime}\r\n\r\n".encode()

    with open(ref_audio_path, "rb") as f:
        body += f.read()
    body += b"\r\n"

    # closing boundary
    body += f"--{boundary}--\r\n".encode()

    url = f"http://localhost:3900{clone_ep}" if clone_ep else CLONE_URL
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            content = resp.read()
            with open(output_path, "wb") as f:
                f.write(content)
            tag = os.path.basename(output_path).replace(".wav", "")
            print(f"  ✅ {tag:40s} │ {len(content)//1024:5d} KB │ {time.time()-t0:4.1f}s │ 🔗clone")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if hasattr(e, 'read') else str(e)
        print(f"  ❌ Clone failed (HTTP {e.code}): {error_body[:200]}")
        return False
    except Exception as e:
        print(f"  ❌ Clone error: {e}")
        return False

def gen_with_json(text, voice, output_path, speed=0.88, guidance_scale=2.0,
                  class_temperature=0.3, postprocess_output=True, seed=42):
    """
    Fallback: /v1/audio/speech — JSON endpoint (seed lock only)
    Clone endpoint কাজ না করলে এটা ব্যবহার হয়।
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    payload = {
        "model": "tts-1-hd",
        "voice": voice,
        "input": text,
        "response_format": "wav",
        "speed": speed,
        "num_step": 32,
        "guidance_scale": guidance_scale,
        "seed": seed,
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
            print(f"  ✅ {tag:40s} │ {len(content)//1024:5d} KB │ {time.time()-t0:4.1f}s │ 🔒seed")
            return True
    except Exception as e:
        print(f"  ❌ {os.path.basename(output_path)}: {e}")
        return False

# ═════════════════════════════════════════════════════════════════════════════
# 🎬 SCRIPT — SEGMENTS
# ═════════════════════════════════════════════════════════════════════════════

SEGMENTS = [
    # ── 01: Opening — calm anticipation ──
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

    # ── 02: Doubt — slight amusement ──
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

    # ── 03: Wonder — building but controlled ──
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
    {"silence_ms": 700},

    # ── 04: Shift — personal, tone drops ──
    {
        "tag": "04_shift",
        "text": (
            "But me... "
            "no. None of those worlds mattered. Not one. "
            "I was searching... for someone."
        ),
        "speed": 0.85,
        "guidance_scale": 2.0,
        "postprocess_output": False,
    },
    {"silence_ms": 800},

    # ── 05: Grief — slow, heavy ──
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

    # ── 06: Hospital — deepest sadness ──
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

    # ── 07: Weight — one line, devastating ──
    {
        "tag": "07_she_never_did",
        "text": "She never did.",
        "speed": 0.82,
        "guidance_scale": 1.8,
        "postprocess_output": False,
    },
    {"silence_ms": 1000},

    # ── 08: Pain — grief meets frustration ──
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

    # ── 09: Plea — quiet, desperate ──
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

    # ── 10: Warmth — relief, restrained ──
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

# ─── Reference Audio নির্ধারণ ────────────────────────────────────────────
# Strategy:
#   1. Custom voice দেওয়া থাকলে → সেটা reference
#   2. না থাকলে → প্রথম segment preset voice দিয়ে generate → সেটা reference
#   3. Clone endpoint না থাকলে → fallback to seed-lock (V8.5 mode)

ref_audio_path = CUSTOM_VOICE_PATH  # None হতে পারে
use_clone = clone_ep is not None or True  # always try clone first
clone_works = None  # None=untested, True/False=tested

print("=" * 70)
print("🎭  V8.6 — REFERENCE AUDIO CHAINING")
print("=" * 70)
print(f"🎙️  Reference  : {ref_audio_path or 'প্রথম segment থেকে তৈরি হবে'}")
print(f"🔗  Clone EP   : {clone_ep or CLONE_URL}")
print(f"🔒  Seed       : {SEED} (fallback)")
print(f"🎬  Segments   : {len(speech_segs)} speech")
print(f"📁  Output     : {os.path.basename(FINAL_OUTPUT_PATH)}")
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
    success = False

    # ─── METHOD 1: Clone with reference audio ─────────────────────────
    if ref_audio_path and clone_works is not False:
        success = gen_with_clone(
            text=seg["text"],
            ref_audio_path=ref_audio_path,
            output_path=wav_path,
            speed=seg.get("speed", 0.88),
            guidance_scale=seg.get("guidance_scale", 2.0),
            seed=SEED,
        )
        if success and clone_works is None:
            clone_works = True
            print(f"  🎉 Clone endpoint কাজ করছে! বাকি সব segment clone দিয়ে হবে\n")
        elif not success and clone_works is None:
            clone_works = False
            print(f"  ⚠️ Clone endpoint কাজ করেনি — JSON fallback ব্যবহার হবে\n")

    # ─── METHOD 2: Fallback — JSON with seed lock ─────────────────────
    if not success:
        success = gen_with_json(
            text=seg["text"],
            voice=PRESET_VOICE,
            output_path=wav_path,
            speed=seg.get("speed", 0.88),
            guidance_scale=seg.get("guidance_scale", 2.0),
            class_temperature=0.3,
            postprocess_output=seg.get("postprocess_output", True),
            seed=SEED,
        )

    if success:
        wav_order.append(wav_path)
        generated += 1

        # প্রথম সফল generation → reference audio হিসেবে ব্যবহার (যদি custom না দেওয়া থাকে)
        if not ref_audio_path:
            ref_audio_path = wav_path
            print(f"  🔄 প্রথম segment → reference audio সেট হয়েছে: {tag}\n")
    else:
        failed.append(tag)

# ─── Concatenate ──────────────────────────────────────────────────────────
print(f"\n{'─' * 70}")
print("🔗 Concatenating...")
final_path = FINAL_OUTPUT_PATH
result = concat_wavs(wav_order, final_path)

total_time = time.time() - total_start
print(f"\n{'=' * 70}")
print(f"🎉  DONE! {generated}/{len(speech_segs)} segments → 1 file")
if failed:
    print(f"  ⚠️  Failed: {', '.join(failed)}")
print(f"  ⏱️  {total_time:.1f}s ({total_time/60:.1f} min)")
print(f"  📁 {final_path}")

# ─── Summary ──────────────────────────────────────────────────────────────
print(f"\n{'─' * 70}")
print("📋 VOICE CONSISTENCY REPORT:")
if clone_works:
    print(f"  🔗 Method: Reference Audio Cloning (BEST)")
    print(f"  🎙️ Reference: {ref_audio_path}")
elif clone_works is False:
    print(f"  🔒 Method: Seed-lock fallback (clone endpoint unavailable)")
    print(f"  🎙️ Voice: {PRESET_VOICE}, Seed: {SEED}")
else:
    print(f"  🔒 Method: Seed-lock (no reference audio)")
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
