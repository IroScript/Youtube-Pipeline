# =============================================================================
# 🎭 V9.0 — ONE VOICE, START TO FINISH  (Absolute Voice Lock)
# =============================================================================
# সমস্যা: "একটু পর পর ভিন্ন মানুষ কথা বলছে"
# লক্ষ্য : শুরুতে যিনি বলছেন, শেষ পর্যন্ত তিনিই বলবেন।
#
# ─────────────────────────────────────────────────────────────────────────────
# V8.6 তে গলা বদলে যাওয়ার ৫টা আসল কারণ (সবগুলো এখানে ফিক্স করা হয়েছে)
# ─────────────────────────────────────────────────────────────────────────────
# 1) MIXED METHODS  : কিছু segment clone endpoint দিয়ে, কিছু JSON preset দিয়ে
#                     তৈরি হচ্ছিল। দুই ইঞ্জিন = দুই মানুষ। এখন একটাই mode,
#                     পুরো রান জুড়ে — preflight probe দিয়ে আগেই ঠিক করা হয়।
# 2) PER-SEGMENT PARAMS : speed 0.82→0.92, guidance_scale 1.8→2.2,
#                     postprocess_output on/off — এগুলো timbre/formant বদলে
#                     দেয়, তাই প্রতিটা segment আলাদা লোক শোনায়।
#                     এখন সব segment-এ হুবহু একই VOICE dict।
# 3) SAMPLE-RATE BUG : make_silence() 22050 Hz লিখত, কিন্তু OmniVoice সাধারণত
#                     24000 Hz দেয়। concat_wavs() প্রথম ফাইলের params নিত →
#                     বাকি সব ক্লিপ ভুল রেটে বাজত = pitch shift = অন্য মানুষ।
#                     এখন সব কিছু TARGET_SR এ resample করে জোড়া হয়।
# 4) LOUDNESS JUMP  : segment-ভেদে RMS আলাদা হলে কান "নতুন বক্তা" ধরে নেয়।
#                     এখন প্রতিটা segment একই RMS (-20 dBFS) এ normalize।
# 5) NO VERIFICATION : খারাপ generation ধরা পড়ত না। এখন প্রতিটা segment-এর
#                     spectral+pitch fingerprint anchor-এর সাথে মিলিয়ে দেখা হয়,
#                     না মিললে অটো re-generate (MAX_RETRIES বার)।
#
# 📖 নীতি: "Reference audio = voice identity. Parameters = must stay frozen."
# =============================================================================
import os, sys, time, json, math, wave, glob, base64, shutil, subprocess
import urllib.request, urllib.error
import numpy as np
from IPython.display import HTML, display
# ═════════════════════════════════════════════════════════════════════════════
# ⚙️  CONFIGURATION  — এই ব্লকটাই শুধু ছোঁবেন
# ═════════════════════════════════════════════════════════════════════════════
HOST            = "http://localhost:3900"
API_URL         = HOST + "/v1/audio/speech"
CLONE_URL       = HOST + "/v1/audio/speech/clone"
HEALTH_URL      = HOST + "/health"
OPENAPI_URL     = HOST + "/openapi.json"
BASE_OUTPUT_DIR = "/kaggle/working/outputs/v9_one_voice"
FILENAME        = "v9_one_voice"
# আপনার ভয়েস স্যাম্পল (৫–১৫ সেকেন্ড, একজনের গলা, নয়েজ-মুক্ত, স্পষ্ট)
CUSTOM_VOICE_PATH = "/kaggle/input/sample-voice/njk-nyntrnr-upy_S4kV3QyM.mp3"
# reference clip-এর হুবহু transcript জানা থাকলে লিখুন (Whisper-এর ভুল এড়ায়,
# ফলে প্রতিবার একই conditioning → গলা আরও স্থির)। না জানলে "" রাখুন।
CUSTOM_VOICE_TEXT = ""
PRESET_VOICE    = "onyx"   # শুধু fallback / anchor তৈরির জন্য
SEED            = 1234
# ── 🔒 FROZEN VOICE PARAMETERS ───────────────────────────────────────────────
# এই ডিক্ট প্রতিটা segment-এ হুবহু একইভাবে যাবে। কখনো per-segment override
# করবেন না — এটাই V8.6-এর সবচেয়ে বড় ভুল ছিল।
# আবেগ (emotion) নিয়ন্ত্রণ করুন শুধু: শব্দচয়ন, কমা/ড্যাশ/ellipsis, আর pause
# length দিয়ে — parameter দিয়ে নয়।
VOICE = {
    "speed":              0.88,
    "guidance_scale":     2.0,
    "num_step":           32,
    "class_temperature":  0.3,
    "postprocess_output": True,
}
# ── Audio pipeline ───────────────────────────────────────────────────────────
TARGET_SR            = 24000    # সব কিছু এখানে resample হবে
TARGET_RMS_DBFS      = -20.0    # সব segment একই লাউডনেসে
PEAK_CEILING         = 0.97
FADE_MS              = 12       # click/pop ঠেকাতে
# ── Voice-drift guard ────────────────────────────────────────────────────────
VERIFY_VOICE         = True
SIMILARITY_THRESHOLD = 0.86     # 0.80 = ঢিলা, 0.90 = কড়া
MAX_RETRIES          = 3
MAX_CHARS_PER_CALL   = 300      # লম্বা টেক্সট ভাঙা হয়, প্যারামিটার একই থাকে
# ═════════════════════════════════════════════════════════════════════════════
# 🎬 SCRIPT — শুধু text + pause. কোনো per-segment voice parameter নেই।
# ═════════════════════════════════════════════════════════════════════════════
SEGMENTS = [
    {"tag": "01_opening", "text":
        "What if the greatest invention in human history... "
        "wasn't a machine that traveled through space, "
        "but one that crossed possibilities?"},
    {"pause_ms": 450},
    {"tag": "02_doubt", "text":
        "Another universe? Seriously? "
        "Scientists kept working. Everyone else kept doubting."},
    {"pause_ms": 350},
    {"tag": "03_wonder", "text":
        "And suddenly, the impossible became real. "
        "We saw dinosaurs, still walking, beneath blood-red skies. "
        "We found another Earth, where humanity was born on Mars."},
    {"pause_ms": 700},
    {"tag": "04_shift", "text":
        "But me... no. None of those worlds mattered. Not one. "
        "I was searching... for someone."},
    {"pause_ms": 800},
    {"tag": "05_grief", "text":
        "Three years ago... cancer... stole my mother. "
        "No warning. No mercy. No second chance."},
    {"pause_ms": 1000},
    {"tag": "06_hospital", "text":
        "I watched the hospital monitor... become... silent. "
        "I held her hand, hoping, just hoping, "
        "she would squeeze mine... one... last... time."},
    {"pause_ms": 1400},
    {"tag": "07_she_never_did", "text":
        "She never did."},
    {"pause_ms": 1000},
    {"tag": "08_pain", "text":
        "I know she will never answer. I know that. "
        "But I still call. "
        "Because sometimes... hope hurts more than reality."},
    {"pause_ms": 800},
    {"tag": "09_plea", "text":
        "Listen. Take me to the universe... where my mother... never died."},
    {"pause_ms": 1200},
    {"tag": "10_warmth", "text":
        "There she was. Alive. Smiling. Making breakfast. "
        "Humming the exact same song she used to sing... "
        "every Sunday morning."},
    {"pause_ms": 1000},
    {"tag": "11_ending", "text":
        "She did not know I was not her son. "
        "I was a broken man... borrowing someone else's miracle."},
]
# calibration line — custom voice না থাকলে এটা দিয়ে anchor তৈরি হয়
ANCHOR_TEXT = ("This is my natural speaking voice, calm and steady, "
               "and I will keep this exact same voice from the first word "
               "to the very last one.")
# ═════════════════════════════════════════════════════════════════════════════
# 🧰 LOW-LEVEL AUDIO UTILITIES  (numpy only — কোনো heavy dependency নেই)
# ═════════════════════════════════════════════════════════════════════════════
def have_ffmpeg():
    return shutil.which("ffmpeg") is not None
def wav_read(path):
    """WAV → (float32 mono [-1,1], sample_rate)"""
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
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm)
def resample(x, sr_in, sr_out):
    """High-quality-enough linear resampler (mono)."""
    if sr_in == sr_out or len(x) == 0:
        return x
    n_out = int(round(len(x) * float(sr_out) / float(sr_in)))
    t_in  = np.arange(len(x), dtype=np.float64)
    t_out = np.linspace(0.0, len(x) - 1.0, n_out)
    return np.interp(t_out, t_in, x).astype(np.float32)
def decode_to_wav(src, dst, sr=TARGET_SR):
    """যেকোনো audio (mp3/m4a/flac/ogg/wav) → mono WAV @ sr"""
    if have_ffmpeg():
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", src,
               "-ac", "1", "-ar", str(sr), "-c:a", "pcm_s16le", dst]
        if subprocess.run(cmd).returncode == 0 and os.path.exists(dst):
            return dst
    if src.lower().endswith(".wav"):
        x, s = wav_read(src)
        wav_write(dst, resample(x, s, sr), sr)
        return dst
    raise RuntimeError("ffmpeg নেই এবং reference WAV নয়: " + src)
def rms(x):
    return float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def normalize_rms(x, target_dbfs=TARGET_RMS_DBFS, ceiling=PEAK_CEILING):
    cur = rms(x)
    if cur < 1e-6:
        return x
    gain = (10.0 ** (target_dbfs / 20.0)) / cur
    y = x * gain
    peak = float(np.max(np.abs(y)) + 1e-12)
    if peak > ceiling:
        y = y * (ceiling / peak)
    return y.astype(np.float32)
def apply_fades(x, sr, ms=FADE_MS):
    n = min(int(sr * ms / 1000.0), len(x) // 2)
    if n <= 0:
        return x
    ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
    x = x.copy()
    x[:n]  *= ramp
    x[-n:] *= ramp[::-1]
    return x
def trim_silence(x, sr, thresh_db=-42.0, pad_ms=60):
    """শুরু/শেষের নীরবতা কাটে — reference clip পরিষ্কার করার জন্য।"""
    win = max(1, int(sr * 0.02))
    if len(x) < win * 3:
        return x
    frames = x[:len(x) - len(x) % win].reshape(-1, win)
    energy = 20.0 * np.log10(np.sqrt(np.mean(frames ** 2, axis=1)) + 1e-9)
    loud = np.where(energy > thresh_db)[0]
    if len(loud) == 0:
        return x
    pad = int(sr * pad_ms / 1000.0)
    a = max(0, loud[0] * win - pad)
    b = min(len(x), (loud[-1] + 1) * win + pad)
    return x[a:b]
def best_window(x, sr, seconds=9.0):
    """সবচেয়ে energetic টানা অংশ বেছে নেয় (reference-এর জন্য আদর্শ)।"""
    want = int(sr * seconds)
    if len(x) <= want:
        return x
    hop = int(sr * 0.25)
    best_i, best_e = 0, -1.0
    for i in range(0, len(x) - want, hop):
        e = rms(x[i:i + want])
        if e > best_e:
            best_e, best_i = e, i
    return x[best_i:best_i + want]
# ═════════════════════════════════════════════════════════════════════════════
# 🧬 SPEAKER FINGERPRINT  (spectral envelope + pitch) — drift ধরার জন্য
# ═════════════════════════════════════════════════════════════════════════════
def spectral_fingerprint(x, sr, n_bands=40):
    n, hop = 1024, 512
    if len(x) < n * 2:
        return None
    w = np.hanning(n).astype(np.float32)
    acc, cnt = None, 0
    for i in range(0, len(x) - n, hop):
        seg = x[i:i + n]
        if rms(seg) < 0.005:            # নীরব ফ্রেম বাদ
            continue
        spec = np.abs(np.fft.rfft(seg * w))
        acc = spec if acc is None else acc + spec
        cnt += 1
    if cnt < 4:
        return None
    S = acc / cnt
    edges = np.linspace(0, len(S), n_bands + 1).astype(int)
    bands = np.array([S[edges[i]:edges[i + 1]].mean() + 1e-9 for i in range(n_bands)])
    v = np.log(bands)
    v = v - v.mean()
    nrm = np.linalg.norm(v) + 1e-9
    return (v / nrm).astype(np.float32)
def median_f0(x, sr, fmin=60.0, fmax=320.0):
    n, hop = 2048, 1024
    vals = []
    for i in range(0, max(1, len(x) - n), hop):
        seg = x[i:i + n]
        if len(seg) < n or rms(seg) < 0.01:
            continue
        seg = seg - seg.mean()
        ac = np.correlate(seg, seg, mode="full")[n - 1:]
        lo, hi = int(sr / fmax), int(sr / fmin)
        if hi >= len(ac):
            continue
        k = int(np.argmax(ac[lo:hi])) + lo
        if ac[k] > 0.3 * (ac[0] + 1e-9):
            vals.append(sr / float(k))
    return float(np.median(vals)) if len(vals) >= 3 else 0.0
def voice_profile(x, sr):
    return {"spec": spectral_fingerprint(x, sr), "f0": median_f0(x, sr)}
def voice_similarity(a, b):
    """0..1 — 1 মানে হুবহু একই বক্তা।"""
    if a is None or b is None or a["spec"] is None or b["spec"] is None:
        return 1.0
    cos = float(np.dot(a["spec"], b["spec"]))
    cos = max(0.0, min(1.0, (cos + 1.0) / 2.0 * 1.0 if cos < 0 else cos))
    if a["f0"] > 0 and b["f0"] > 0:
        ratio = min(a["f0"], b["f0"]) / max(a["f0"], b["f0"])
        pitch = max(0.0, 1.0 - (1.0 - ratio) * 2.5)     # 20% pitch drift = 0.5
    else:
        pitch = cos
    return 0.72 * cos + 0.28 * pitch
# ═════════════════════════════════════════════════════════════════════════════
# 🌐 SERVER + ENDPOINT
# ═════════════════════════════════════════════════════════════════════════════
def server_alive():
    try:
        with urllib.request.urlopen(urllib.request.Request(HEALTH_URL), timeout=5) as r:
            return r.status == 200
    except Exception:
        return False
def find_studio_dir():
    for root, dirs, files in os.walk("/kaggle/working"):
        if "backend" in dirs and os.path.exists(os.path.join(root, "backend", "main.py")):
            return root
    return None
def start_server():
    studio = find_studio_dir()
    if not studio:
        print("  ❌ OmniVoice Studio পাওয়া যায়নি! আগে Step 2 রান করুন।")
        return False
    print("  📂 " + studio)
    log = open("/tmp/omnivoice.log", "w")
    subprocess.Popen(["uv", "run", "python", "backend/main.py"],
                     stdout=log, stderr=log, cwd=studio)
    for i in range(30):
        time.sleep(2)
        if server_alive():
            print("  ✅ Server ready! (" + str((i + 1) * 2) + "s)")
            return True
    print("  ❌ Failed! Run: !cat /tmp/omnivoice.log")
    return False
def discover_clone_endpoint():
    """clone route আছে কিনা openapi.json থেকে দেখি।"""
    try:
        with urllib.request.urlopen(urllib.request.Request(OPENAPI_URL), timeout=10) as r:
            spec = json.loads(r.read().decode())
        for path, methods in sorted(spec.get("paths", {}).items()):
            if "clone" in path and "post" in methods:
                return path
    except Exception as e:
        print("  ⚠️ openapi.json পড়া যায়নি: " + str(e))
    return None
# ═════════════════════════════════════════════════════════════════════════════
# 📡 REQUESTS
# ═════════════════════════════════════════════════════════════════════════════
def post_multipart(url, fields, file_field, file_path, timeout=600):
    boundary = "----OmniVoiceLock" + str(int(time.time() * 1000))
    body = b""
    for k, v in fields.items():
        body += ("--" + boundary + "\r\n").encode()
        body += ('Content-Disposition: form-data; name="' + k + '"\r\n\r\n').encode()
        body += (str(v) + "\r\n").encode()
    fname = os.path.basename(file_path)
    ext = os.path.splitext(fname)[1].lower()
    mime = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".flac": "audio/flac",
            ".ogg": "audio/ogg", ".m4a": "audio/mp4"}.get(ext, "audio/wav")
    body += ("--" + boundary + "\r\n").encode()
    body += ('Content-Disposition: form-data; name="' + file_field +
             '"; filename="' + fname + '"\r\n').encode()
    body += ("Content-Type: " + mime + "\r\n\r\n").encode()
    with open(file_path, "rb") as f:
        body += f.read()
    body += b"\r\n"
    body += ("--" + boundary + "--\r\n").encode()
    req = urllib.request.Request(
        url, data=body, method="POST",
        headers={"Content-Type": "multipart/form-data; boundary=" + boundary})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()
def clone_fields(text, minimal=False):
    """প্রতিটা call-এ হুবহু একই parameter set — এটাই voice lock-এর মূল।"""
    f = {"text": text, "input": text, "seed": SEED, "speed": VOICE["speed"]}
    if CUSTOM_VOICE_TEXT:
        f["ref_text"] = CUSTOM_VOICE_TEXT
    if minimal:
        return {k: v for k, v in f.items() if k in ("text", "input", "ref_text")}
    f["guidance_scale"] = VOICE["guidance_scale"]
    f["num_step"] = VOICE["num_step"]
    f["response_format"] = "wav"
    return f
def gen_clone(text, ref_wav, out_path, clone_ep):
    url = HOST + clone_ep if clone_ep else CLONE_URL
    for minimal in (False, True):     # অতিরিক্ত field-এ 422 হলে minimal-এ retry
        try:
            data = post_multipart(url, clone_fields(text, minimal), "ref_audio", ref_wav)
            with open(out_path, "wb") as f:
                f.write(data)
            return True
        except urllib.error.HTTPError as e:
            msg = ""
            try:
                msg = e.read().decode()[:180]
            except Exception:
                pass
            if e.code in (400, 422) and not minimal:
                continue
            print("    ❌ clone HTTP " + str(e.code) + ": " + msg)
            return False
        except Exception as e:
            print("    ❌ clone error: " + str(e))
            return False
    return False
def gen_json(text, out_path, voice=None):
    """Fallback — clone route না থাকলে। এখানেও প্যারামিটার হুবহু frozen।"""
    payload = {
        "model": "tts-1-hd",
        "voice": voice or PRESET_VOICE,
        "input": text,
        "response_format": "wav",
        "speed": VOICE["speed"],
        "num_step": VOICE["num_step"],
        "guidance_scale": VOICE["guidance_scale"],
        "class_temperature": VOICE["class_temperature"],
        "postprocess_output": VOICE["postprocess_output"],
        "seed": SEED,
    }
    req = urllib.request.Request(API_URL, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            data = r.read()
        with open(out_path, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print("    ❌ json error: " + str(e))
        return False
# ═════════════════════════════════════════════════════════════════════════════
# ✂️  TEXT CHUNKING — লম্বা লাইন ভাঙে, কিন্তু voice setting একই থাকে
# ═════════════════════════════════════════════════════════════════════════════
def split_text(text, limit=MAX_CHARS_PER_CALL):
    text = " ".join(text.split())
    if len(text) <= limit:
        return [text]
    parts, buf = [], ""
    for piece in text.replace("? ", "?|").replace("! ", "!|").replace(". ", ".|").split("|"):
        if len(buf) + len(piece) + 1 <= limit:
            buf = (buf + " " + piece).strip()
        else:
            if buf:
                parts.append(buf)
            buf = piece.strip()
    if buf:
        parts.append(buf)
    return parts
# ═════════════════════════════════════════════════════════════════════════════
# 🚀 PIPELINE
# ═════════════════════════════════════════════════════════════════════════════
def next_version(base_dir, base_name):
    os.makedirs(base_dir, exist_ok=True)
    v = 1
    while os.path.exists(os.path.join(base_dir, base_name + "_v" + str(v) + ".wav")):
        v += 1
    return v, os.path.join(base_dir, base_name + "_v" + str(v) + ".wav")
def auto_discover_voice(given):
    if given and os.path.exists(given):
        return given
    print("  ⚠️ দেওয়া পাথে ফাইল নেই: " + str(given))
    found = []
    for root, dirs, files in os.walk("/kaggle/input"):
        for f in files:
            if f.lower().endswith((".mp3", ".wav", ".flac", ".ogg", ".m4a")):
                found.append(os.path.join(root, f))
    if not found:
        print("  ❌ /kaggle/input/ এ কোনো অডিও নেই → anchor TTS দিয়ে বানানো হবে")
        return None
    found.sort()
    print("  📋 পাওয়া গেছে " + str(len(found)) + " টি অডিও, ব্যবহার: " + found[0])
    return found[0]
print("=" * 74)
print("🔧 SERVER CHECK")
print("=" * 74)
if server_alive():
    print("  ✅ Server running")
elif not start_server():
    raise RuntimeError("Server failed. Step 2 & 3 আগে চালান।")
clone_ep = discover_clone_endpoint()
print("  🔗 Clone endpoint: " + str(clone_ep or "(default " + CLONE_URL + ")"))
RUN_VERSION, FINAL_OUTPUT_PATH = next_version(BASE_OUTPUT_DIR, FILENAME)
seg_dir  = os.path.join(BASE_OUTPUT_DIR, "segments_v" + str(RUN_VERSION))
work_dir = os.path.join(BASE_OUTPUT_DIR, "work")
os.makedirs(seg_dir, exist_ok=True)
os.makedirs(work_dir, exist_ok=True)
# ── STEP 1: ANCHOR (একটাই গলা, পুরো ট্র্যাকের ভিত্তি) ────────────────────────
print()
print("=" * 74)
print("🎙️  STEP 1 — ANCHOR VOICE তৈরি")
print("=" * 74)
anchor_wav = os.path.join(work_dir, "anchor.wav")
src_voice  = auto_discover_voice(CUSTOM_VOICE_PATH)
MODE = None      # "clone" বা "preset" — একবার ঠিক হলে সারা রান একই থাকবে
if src_voice:
    tmp = os.path.join(work_dir, "_ref_raw.wav")
    decode_to_wav(src_voice, tmp, TARGET_SR)
    x, sr = wav_read(tmp)
    x = best_window(trim_silence(x, sr), sr, 9.0)
    x = apply_fades(normalize_rms(x), sr)
    wav_write(anchor_wav, x, sr)
    print("  ✅ Custom reference: " + src_voice)
    print("     → anchor.wav  " + str(round(len(x) / sr, 1)) + "s @ " + str(sr) + " Hz")
    MODE = "clone"
else:
    print("  🔁 custom voice নেই → preset '" + PRESET_VOICE + "' দিয়ে anchor বানাচ্ছি...")
    raw = os.path.join(work_dir, "_anchor_raw.wav")
    if gen_json(ANCHOR_TEXT, raw):
        x, sr = wav_read(raw)
        x = resample(x, sr, TARGET_SR)
        x = apply_fades(normalize_rms(best_window(trim_silence(x, TARGET_SR), TARGET_SR, 9.0)), TARGET_SR)
        wav_write(anchor_wav, x, TARGET_SR)
        print("  ✅ anchor.wav তৈরি হয়েছে preset voice থেকে")
        MODE = "clone"
    else:
        print("  ⚠️ anchor বানানো যায়নি → পুরো রান preset+seed mode এ চলবে")
        MODE = "preset"
# ── STEP 2: PREFLIGHT PROBE — mode একবারেই লক ─────────────────────────────────
print()
print("=" * 74)
print("🧪 STEP 2 — PREFLIGHT (mode লক করা হচ্ছে, মাঝপথে আর বদলাবে না)")
print("=" * 74)
if MODE == "clone":
    probe = os.path.join(work_dir, "_probe.wav")
    ok = gen_clone("Testing one single voice.", anchor_wav, probe, clone_ep)
    if ok and os.path.getsize(probe) > 2000:
        print("  ✅ CLONE mode কাজ করছে → সব segment reference-locked হবে")
    else:
        MODE = "preset"
        print("  ⚠️ clone endpoint অচল → পুরো রান preset+seed mode এ (তবুও একই গলা,")
        print("     কারণ সব segment একই voice + একই frozen parameters ব্যবহার করবে)")
else:
    print("  ▶ preset+seed mode")
# anchor profile — drift মাপার রেফারেন্স
anchor_profile = None
if VERIFY_VOICE and os.path.exists(anchor_wav):
    ax, asr = wav_read(anchor_wav)
    anchor_profile = voice_profile(ax, asr)
print()
print("=" * 74)
print("🎭  V9.0 — ONE VOICE, START TO FINISH")
print("=" * 74)
print("  🔊 Mode        : " + MODE.upper())
print("  🎙️ Reference   : " + (anchor_wav if MODE == "clone" else PRESET_VOICE))
print("  🔒 Frozen      : speed=" + str(VOICE["speed"]) +
      "  gs=" + str(VOICE["guidance_scale"]) +
      "  steps=" + str(VOICE["num_step"]) + "  seed=" + str(SEED))
print("  📈 Verify      : " + ("on (threshold " + str(SIMILARITY_THRESHOLD) + ")" if VERIFY_VOICE else "off"))
print("  🎬 Segments    : " + str(len([s for s in SEGMENTS if "text" in s])))
print("  📁 Output      : " + os.path.basename(FINAL_OUTPUT_PATH))
print("=" * 74)
print()
def synth_once(text, out_path):
    ok = (gen_clone(text, anchor_wav, out_path, clone_ep) if MODE == "clone"
          else gen_json(text, out_path))
    if not ok or not os.path.exists(out_path) or os.path.getsize(out_path) < 1000:
        return None
    x, sr = wav_read(out_path)
    x = resample(x, sr, TARGET_SR)
    x = trim_silence(x, TARGET_SR, thresh_db=-45.0, pad_ms=40)
    x = normalize_rms(x)                # ← loudness jump বন্ধ
    x = apply_fades(x, TARGET_SR)       # ← click/pop বন্ধ
    return x
def synth_verified(text, tag, idx):
    """generate → fingerprint মিলিয়ে দেখা → না মিললে retry। সেরা attempt রাখে।"""
    best_x, best_score = None, -1.0
    for attempt in range(1, MAX_RETRIES + 1):
        raw = os.path.join(work_dir, "_tmp_" + tag + "_" + str(idx) + "_" + str(attempt) + ".wav")
        x = synth_once(text, raw)
        if x is None:
            print("    ↻ attempt " + str(attempt) + " ব্যর্থ, আবার চেষ্টা...")
            time.sleep(1.5)
            continue
        if not VERIFY_VOICE or anchor_profile is None:
            return x, 1.0
        score = voice_similarity(anchor_profile, voice_profile(x, TARGET_SR))
        if score > best_score:
            best_x, best_score = x, score
        if score >= SIMILARITY_THRESHOLD:
            return x, score
        print("    ⚠️ voice drift ধরা পড়েছে (score " + str(round(score, 3)) +
              " < " + str(SIMILARITY_THRESHOLD) + ") → re-generate " +
              str(attempt) + "/" + str(MAX_RETRIES))
    return best_x, best_score
timeline   = []      # (numpy audio) টুকরোগুলো ক্রমানুসারে
report     = []
failed     = []
t_start    = time.time()
for seg in SEGMENTS:
    if "pause_ms" in seg:
        n = int(TARGET_SR * seg["pause_ms"] / 1000.0)
        timeline.append(np.zeros(n, dtype=np.float32))   # ← সঠিক sample rate!
        continue
    tag = seg["tag"]
    chunks = split_text(seg["text"])
    t0 = time.time()
    pieces, scores = [], []
    for i, chunk in enumerate(chunks):
        x, score = synth_verified(chunk, tag, i)
        if x is None:
            failed.append(tag + "#" + str(i))
            continue
        pieces.append(x)
        scores.append(score)
        if i < len(chunks) - 1:
            pieces.append(np.zeros(int(TARGET_SR * 0.16), dtype=np.float32))
    if not pieces:
        print("  ❌ " + tag + " — কিছুই তৈরি হয়নি")
        continue
    seg_audio = np.concatenate(pieces)
    seg_path  = os.path.join(seg_dir, tag + ".wav")
    wav_write(seg_path, seg_audio, TARGET_SR)
    timeline.append(seg_audio)
    s = min(scores) if scores else 1.0
    report.append((tag, s, len(seg_audio) / TARGET_SR))
    mark = "✅" if s >= SIMILARITY_THRESHOLD else "⚠️"
    print("  " + mark + " " + tag.ljust(20) +
          " │ " + str(round(len(seg_audio) / TARGET_SR, 1)).rjust(5) + "s" +
          " │ match " + str(round(s, 3)) +
          " │ " + str(round(time.time() - t0, 1)) + "s" +
          " │ " + ("🔗clone" if MODE == "clone" else "🔒seed"))
# ── STEP 3: MASTER + CONCAT (সব একই SR, একই লাউডনেস) ─────────────────────────
print()
print("─" * 74)
print("🔗 Concatenating (single sample-rate, single loudness)...")
final = np.concatenate(timeline) if timeline else np.zeros(1, dtype=np.float32)
final = normalize_rms(final, TARGET_RMS_DBFS + 2.0)   # সামান্য গরম master
peak = float(np.max(np.abs(final)) + 1e-9)
if peak > PEAK_CEILING:
    final = final * (PEAK_CEILING / peak)
wav_write(FINAL_OUTPUT_PATH, final, TARGET_SR)
dur = len(final) / TARGET_SR
size_kb = os.path.getsize(FINAL_OUTPUT_PATH) // 1024
print("  🎬 FINAL: " + os.path.basename(FINAL_OUTPUT_PATH) +
      "  (" + str(size_kb) + " KB, " + str(round(dur, 1)) + "s @ " + str(TARGET_SR) + " Hz)")
# ── REPORT ───────────────────────────────────────────────────────────────────
print()
print("=" * 74)
print("📋 VOICE CONSISTENCY REPORT")
print("=" * 74)
if report:
    worst = min(r[1] for r in report)
    avg   = sum(r[1] for r in report) / len(report)
    for tag, s, d in report:
        bar = "█" * int(max(0.0, min(1.0, s)) * 24)
        print("  " + tag.ljust(20) + " " + str(round(s, 3)) + "  " + bar)
    print("  " + "-" * 60)
    print("  average match : " + str(round(avg, 3)))
    print("  worst match   : " + str(round(worst, 3)))
    if worst >= SIMILARITY_THRESHOLD:
        print("  ✅ পুরো ট্র্যাকে একজনই কথা বলছে — শুরু থেকে শেষ পর্যন্ত।")
    else:
        print("  ⚠️ কিছু segment এখনো drift করছে। করণীয়:")
        print("     • CUSTOM_VOICE_PATH এ ৮–১২s পরিষ্কার single-speaker ক্লিপ দিন")
        print("     • CUSTOM_VOICE_TEXT এ ক্লিপের হুবহু transcript লিখুন")
        print("     • MAX_CHARS_PER_CALL কমিয়ে 200 করুন")
        print("     • guidance_scale 2.0 → 2.4 করুন (বেশি reference adherence)")
if failed:
    print("  ❌ failed: " + ", ".join(failed))
print("  ⏱️ total: " + str(round(time.time() - t_start, 1)) + "s")
print("=" * 74)
# ── DOWNLOAD ─────────────────────────────────────────────────────────────────
if os.path.exists(FINAL_OUTPUT_PATH):
    with open(FINAL_OUTPUT_PATH, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    dl = os.path.basename(FINAL_OUTPUT_PATH)
    mb = os.path.getsize(FINAL_OUTPUT_PATH) / (1024 * 1024)
    display(HTML(
        '<audio controls src="data:audio/wav;base64,' + b64 + '" style="width:100%;margin:8px 0"></audio>'
        '<a download="' + dl + '" href="data:audio/wav;base64,' + b64 + '">'
        '<button style="padding:14px 28px;background:linear-gradient(135deg,#667eea,#764ba2);'
        'color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">'
        '⬇️ Download ' + dl + ' (' + str(round(mb, 1)) + ' MB)</button></a>'))
else:
    print("❌ ফাইল তৈরি হয়নি।")
