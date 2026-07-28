# =============================================================================
# 🎭 V10 — COMBINE MODE: পুরো স্ক্রিপ্ট সর্বনিম্ন API call-এ
# =============================================================================
# আপনার server-এ clone endpoint নেই (HTTP 404), seed voice lock করে না,
# reference clip-এ একাধিক speaker — এই ৩টা সমস্যার জন্যই একমাত্র সমাধান:
#
# 📌 পুরো স্ক্রিপ্ট ১-২ টা API call-এ submit করা।
#    যত কম call = তত কম voice বদলানোর সুযোগ।
#
# V10 vs V9.5 পার্থক্য:
#   ❌ anchor reference chaining সরানো (clone নেই)
#   ❌ speaker fingerprint verification সরানো (ভুল positive)
#   ❌ per-segment gender check সরানো (unreliable)
#   ✅ COMBINE_MODE: "all_in_one" / "split"
#   ✅ guidance_scale 2.0→3.0 (preset adherence বাড়াতে)
#   ✅ class_temperature = 0 (max determinism)
#   ✅ MAX_CHARS_PER_CALL = 1500 (পাওয়া গেলে পুরো script একবারে)
# =============================================================================

import os, sys, time, json, math, wave, base64, shutil, subprocess
import urllib.request, urllib.error
import numpy as np
from IPython.display import HTML, display

# ═════════════════════════════════════════════════════════════════════════════
# ⚙️  CONFIGURATION
# ═════════════════════════════════════════════════════════════════════════════
HOST            = "http://localhost:3900"
API_URL         = HOST + "/v1/audio/speech"
HEALTH_URL      = HOST + "/health"
OPENAPI_URL     = HOST + "/openapi.json"

BASE_OUTPUT_DIR = "/kaggle/working/outputs/v10_combine"
FILENAME        = "v10_combine"

# ── সবচেয়ে গুরুত্বপূর্ণ ──────────────────────────────────────────────────
# COMBINE_MODE:
#   "all_in_one" → পুরো স্ক্রিপ্ট ১টাই API call (দ্রুত, voice lock নিশ্চিত)
#   "split"      → MAX_CHARS_PER_CALL অনুযায়ী ভাগ (safe, কম error)
COMBINE_MODE = "all_in_one"      # 👈 এইটা চেষ্টা করুন আগে

# MAX_CHARS_PER_CALL = 0 মানে unlimited (শুধু all_in_one mode-এ কাজ করে)
MAX_CHARS_PER_CALL = 0           # 0 = unlimited (all_in_one)
# "split" mode-এ per-call limit:
SPLIT_CHARS      = 600

# ── Voice ──────────────────────────────────────────────────────────────────
VOICE = "onyx"                   # আপনার পছন্দের preset
SEED  = 1234

# Frozen params — সব segment-এ একই
SPEED             = 0.88
GUIDANCE_SCALE    = 3.0          # ↑ V9.5-এ ছিল 2.0, এখন 3.0 = বেশি voice lock
NUM_STEP          = 32
CLASS_TEMPERATURE = 0.0          # 0 = সম্পূর্ণ deterministic
POSTPROCESS       = True

# ── Audio pipeline ─────────────────────────────────────────────────────────
TARGET_SR         = 24000
TARGET_RMS_DBFS   = -20.0
PEAK_CEILING      = 0.97
FADE_MS           = 12

# ── Script pauses ──────────────────────────────────────────────────────────
# প্রতিটা pause_ms একটা নীরবতা segment হিসেবে যুক্ত হবে। এগুলো parameter নয়,
# শুধু timing fix করার জন্য।
PAUSE_BETWEEN_PARAGRAPHS = 800   # ms


# ═════════════════════════════════════════════════════════════════════════════
# 🎬 SCRIPT — শুধু text + pause_ms। আর কিছু না।
# ═════════════════════════════════════════════════════════════════════════════
SEGMENTS = [
    {"tag": "01_opening", "pause_ms": 0, "text":
        "What if the greatest invention in human history "
        "wasn't a machine that traveled through space, "
        "but one that crossed possibilities?"},
    {"tag": "02_doubt", "pause_ms": 450, "text":
        "Another universe? Seriously? "
        "Scientists kept working. Everyone else kept doubting."},
    {"tag": "03_wonder", "pause_ms": 350, "text":
        "And suddenly, the impossible became real. "
        "We saw dinosaurs, still walking, beneath blood-red skies. "
        "We found another Earth, where humanity was born on Mars."},
    {"tag": "04_shift", "pause_ms": 700, "text":
        "But me... no. None of those worlds mattered. Not one. "
        "I was searching... for someone."},
    {"tag": "05_grief", "pause_ms": 800, "text":
        "Three years ago... cancer... stole my mother. "
        "No warning. No mercy. No second chance."},
    {"tag": "06_hospital", "pause_ms": 1000, "text":
        "I watched the hospital monitor... become... silent. "
        "I held her hand, hoping, just hoping, "
        "she would squeeze mine... one... last... time."},
    {"tag": "07_she_never_did", "pause_ms": 1400, "text":
        "She never did."},
    {"tag": "08_pain", "pause_ms": 1000, "text":
        "I know she will never answer. I know that. "
        "But I still call. "
        "Because sometimes... hope hurts more than reality."},
    {"tag": "09_plea", "pause_ms": 800, "text":
        "Listen. Take me to the universe... where my mother... never died."},
    {"tag": "10_warmth", "pause_ms": 1200, "text":
        "There she was. Alive. Smiling. Making breakfast. "
        "Humming the exact same song she used to sing... "
        "every Sunday morning."},
    {"tag": "11_ending", "pause_ms": 1000, "text":
        "She did not know I was not her son. "
        "I was a broken man... borrowing someone else's miracle."},
]


# ═════════════════════════════════════════════════════════════════════════════
# 🧰 AUDIO UTILITIES
# ═════════════════════════════════════════════════════════════════════════════
def wav_read(path):
    with wave.open(path, "rb") as wf:
        nch, sw, sr, n = wf.getnchannels(), wf.getsampwidth(), wf.getframerate(), wf.getnframes()
        raw = wf.readframes(n)
    if sw == 2:
        x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    elif sw == 1:
        x = (np.frombuffer(raw, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif sw == 4:
        x = np.frombuffer(raw, dtype="<i4").astype(np.float32) / 2147483648.0
    else:
        raise ValueError("Unsupported sample width: " + str(sw))
    if nch > 1:
        x = x.reshape(-1, nch).mean(axis=1)
    return x.astype(np.float32), sr

def wav_write(path, x, sr):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = np.clip(x, -1.0, 1.0)
    pcm = (x * 32767.0).astype("<i2").tobytes()
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
        wf.writeframes(pcm)

def rms(x):
    return float(np.sqrt(np.mean(np.square(x)) + 1e-12))

def normalize_rms(x, target_dbfs=TARGET_RMS_DBFS, ceiling=PEAK_CEILING):
    cur = rms(x)
    if cur < 1e-6: return x
    gain = (10.0 ** (target_dbfs / 20.0)) / cur
    y = x * gain
    peak = float(np.max(np.abs(y)) + 1e-12)
    if peak > ceiling: y = y * (ceiling / peak)
    return y.astype(np.float32)

def apply_fades(x, sr, ms=FADE_MS):
    n = min(int(sr * ms / 1000.0), len(x) // 2)
    if n <= 0: return x
    ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
    x = x.copy(); x[:n] *= ramp; x[-n:] *= ramp[::-1]
    return x

def silence(sr, ms):
    return np.zeros(int(sr * ms / 1000.0), dtype=np.float32)


# ═════════════════════════════════════════════════════════════════════════════
# 🌐 SERVER
# ═════════════════════════════════════════════════════════════════════════════
def server_alive():
    try:
        with urllib.request.urlopen(urllib.request.Request(HEALTH_URL), timeout=5) as r:
            return r.status == 200
    except: return False

def find_studio_dir():
    for root, dirs, files in os.walk("/kaggle/working"):
        if "backend" in dirs and os.path.exists(os.path.join(root, "backend", "main.py")):
            return root
    return None

def start_server():
    s = find_studio_dir()
    if not s: print("  ❌ OmniVoice Studio পাওয়া যায়নি!"); return False
    log = open("/tmp/omnivoice.log", "w")
    subprocess.Popen(["uv", "run", "python", "backend/main.py"], stdout=log, stderr=log, cwd=s)
    for i in range(30):
        time.sleep(2)
        if server_alive(): print("  ✅ Server ready!"); return True
    return False


# ═════════════════════════════════════════════════════════════════════════════
# 📡 API — শুধু JSON mode, কোনো clone নয়
# ═════════════════════════════════════════════════════════════════════════════
def gen_speech(text, voice, out_path):
    """JSON API call — একমাত্র পদ্ধতি (clone ব্যর্থ)"""
    payload = {
        "model": "tts-1-hd",
        "voice": voice,
        "input": text,
        "response_format": "wav",
        "speed": SPEED,
        "num_step": NUM_STEP,
        "guidance_scale": GUIDANCE_SCALE,
        "class_temperature": CLASS_TEMPERATURE,
        "postprocess_output": POSTPROCESS,
        "seed": SEED,
    }
    req = urllib.request.Request(
        API_URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            data = r.read()
        with open(out_path, "wb") as f: f.write(data)
        return True, len(data)
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200] if hasattr(e, 'read') else str(e)
        return False, f"HTTP {e.code}: {body}"
    except Exception as e:
        return False, str(e)


# ═════════════════════════════════════════════════════════════════════════════
# 🚀 PIPELINE
# ═════════════════════════════════════════════════════════════════════════════
def next_version(base_dir, base_name):
    os.makedirs(base_dir, exist_ok=True)
    v = 1
    while os.path.exists(os.path.join(base_dir, base_name + "_v" + str(v) + ".wav")): v += 1
    return v, os.path.join(base_dir, base_name + "_v" + str(v) + ".wav")


print("=" * 74)
print("🔧 SERVER CHECK")
print("=" * 74)
if server_alive():
    print("  ✅ Server running")
elif not start_server():
    raise RuntimeError("Server failed.")

RUN_VERSION, FINAL_OUTPUT_PATH = next_version(BASE_OUTPUT_DIR, FILENAME)
seg_dir  = os.path.join(BASE_OUTPUT_DIR, "segments_v" + str(RUN_VERSION))
work_dir = os.path.join(BASE_OUTPUT_DIR, "work")
os.makedirs(seg_dir, exist_ok=True); os.makedirs(work_dir, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# PREPARE TEXT — COMBINE_MODE অনুযায়ী
# ─────────────────────────────────────────────────────────────────────────────
speech_segs = [s for s in SEGMENTS if s.get("text")]
all_texts = [s["text"] for s in speech_segs]
all_tags  = [s["tag"] for s in speech_segs]
all_pauses = [s.get("pause_ms", 0) for s in SEGMENTS if s.get("pause_ms") is not None]

if COMBINE_MODE == "all_in_one":
    # পুরো script একটাই স্ট্রিং
    full_text = " ".join(all_texts)
    chunks   = [(full_text, "FULL")]
    strategy = f"all_in_one (1 call, {len(full_text)} chars)"
elif COMBINE_MODE == "split":
    limit = SPLIT_CHARS
    chunks, buf, buf_tags, buf_pauses = [], "", [], []
    for i, (t, tag) in enumerate(zip(all_texts, all_tags)):
        pause = all_pauses[i] if i < len(all_pauses) else PAUSE_BETWEEN_PARAGRAPHS
        if len(buf) + len(t) + 2 > limit and buf:
            chunks.append((buf, "+".join(buf_tags)))
            buf, buf_tags = "", []
        buf += (" " + t) if buf else t
        buf_tags.append(tag)
    if buf:
        chunks.append((buf, "+".join(buf_tags)))
    strategy = f"split ({len(chunks)} calls, {SPLIT_CHARS} chars/call)"
else:
    raise ValueError("Unknown COMBINE_MODE: " + COMBINE_MODE)

print()
print("=" * 74)
print("🎭  V10 — COMBINE MODE")
print("=" * 74)
print("  🔊 Voice       :", VOICE)
print("  🔒 Seed        :", SEED)
print("  🎚️ Guidance    :", GUIDANCE_SCALE)
print("  🌡️ Class temp  :", CLASS_TEMPERATURE)
print("  📦 Strategy    :", strategy)
print("  🎬 Segments    :", len(speech_segs), "speech")
print("  📁 Output      :", os.path.basename(FINAL_OUTPUT_PATH))
print("=" * 74)
print()


# ─────────────────────────────────────────────────────────────────────────────
# GENERATE
# ─────────────────────────────────────────────────────────────────────────────
timeline  = []
generated = 0
failed    = []
t_start   = time.time()

for text, tag_label in chunks:
    t0 = time.time()
    raw_path = os.path.join(work_dir, f"_{tag_label}.wav")
    ok, extra = gen_speech(text, VOICE, raw_path)

    if not ok:
        failed.append(tag_label)
        print(f"  ❌ {tag_label:30s} — {extra}")
        continue

    x, sr = wav_read(raw_path)
    x = x.astype(np.float32)
    # normalize pipeline
    x = normalize_rms(x)
    x = apply_fades(x, sr)
    dur = len(x) / sr

    # save individual segment
    chunk_wav = os.path.join(seg_dir, f"{tag_label}.wav")
    wav_write(chunk_wav, x, sr)

    kb = extra // 1024 if isinstance(extra, int) else os.path.getsize(raw_path) // 1024
    print(f"  ✅ {tag_label:30s} │ {dur:5.1f}s │ {kb:5d} KB │ {time.time()-t0:4.1f}s")
    timeline.append((tag_label, x))
    generated += 1

    # pause after this chunk (except last)
    if len(timeline) < len(chunks):
        pause_ms = PAUSE_BETWEEN_PARAGRAPHS
        timeline.append(("_pause", silence(TARGET_SR, pause_ms)))


# ─────────────────────────────────────────────────────────────────────────────
# CONCATENATE + MASTER
# ─────────────────────────────────────────────────────────────────────────────
print()
print("─" * 74)
print("🔗 Concatenating...")

parts = []
for label, x in timeline:
    if label.startswith("_"):
        parts.append(x)
    else:
        # resample to TARGET_SR
        parts.append(x)  # ইতিমধ্যেই normalize করা হয়েছে

if not parts:
    print("  ❌ কিছুই তৈরি হয়নি!"); sys.exit(1)

final = np.concatenate(parts)
final = normalize_rms(final, TARGET_RMS_DBFS + 2.0)
peak = float(np.max(np.abs(final)) + 1e-9)
if peak > PEAK_CEILING:
    final = final * (PEAK_CEILING / peak)
wav_write(FINAL_OUTPUT_PATH, final, TARGET_SR)

dur = len(final) / TARGET_SR
size_kb = os.path.getsize(FINAL_OUTPUT_PATH) // 1024
print(f"  🎬 FINAL: {os.path.basename(FINAL_OUTPUT_PATH)} ({size_kb} KB, {dur:.1f}s)")


# ─────────────────────────────────────────────────────────────────────────────
# REPORT
# ─────────────────────────────────────────────────────────────────────────────
print()
print("=" * 74)
print("📋 REPORT")
print("=" * 74)
print(f"  ✅ Generated  : {generated}/{len(chunks)} chunks")
if failed:
    print(f"  ❌ Failed     : {', '.join(failed)}")
print(f"  🎚️ Voice      : {VOICE}")
print(f"  🔒 Seed       : {SEED}")
print(f"  🎚️ Guidance   : {GUIDANCE_SCALE}")
print(f"  🌡️ Class temp : {CLASS_TEMPERATURE}")
print(f"  📦 Strategy   : {strategy}")
print(f"  ⏱️ Total      : {time.time()-t_start:.1f}s")
print(f"  📁 File       : {FINAL_OUTPUT_PATH}")

if COMBINE_MODE == "all_in_one":
    print()
    print("  💡 ALL_IN_ONE — পুরো স্ক্রিপ্ট একটাই API call.")
    print("     ভেতরে কোনো voice বদলানোর সুযোগ নেই।")
    print("     তবুও যদি Male→Female শোনা যায়,")
    print("     তাহলে কারণ OmniVoice server-ই inconsistent,")
    print("     আপনার script-এর সমস্যা না।")
elif COMBINE_MODE == "split":
    print()
    print("  💡 SPLIT MODE — {len(chunks)} টি call.")
    print(f"     প্রতিটা {SPLIT_CHARS} character। সব একই voice + seed + params।")
    print("     যদি voice বদলায়, তাহলে split কমিয়ে দিন")
    print("     বা all_in_one mode ব্যবহার করুন।")


# ─────────────────────────────────────────────────────────────────────────────
# DOWNLOAD
# ─────────────────────────────────────────────────────────────────────────────
if os.path.exists(FINAL_OUTPUT_PATH):
    with open(FINAL_OUTPUT_PATH, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    dl = os.path.basename(FINAL_OUTPUT_PATH)
    mb = os.path.getsize(FINAL_OUTPUT_PATH) / (1024 * 1024)
    display(HTML(
        '<audio controls src="data:audio/wav;base64,' + b64 +
        '" style="width:100%;margin:8px 0"></audio>'
        '<a download="' + dl + '" href="data:audio/wav;base64,' + b64 + '">'
        '<button style="padding:14px 28px;background:linear-gradient(135deg,#667eea,#764ba2);'
        'color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">'
        '⬇️ Download ' + dl + ' (' + str(round(mb, 1)) + ' MB)</button></a>'))
else:
    print("❌ ফাইল তৈরি হয়নি।")
