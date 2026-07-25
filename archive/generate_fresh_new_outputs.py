import sys
import os
import shutil
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

base_dir = r"C:\Users\Irak\Desktop\Youtube Pipeline"

# Import our 3 engine modules
sys.path.append(os.path.join(base_dir, "voice"))
sys.path.append(os.path.join(base_dir, "sfx"))
sys.path.append(os.path.join(base_dir, "bgm"))

import voice.voice_engine as voice_eng
import sfx.sfx_engine as sfx_eng
import bgm.bgm_engine as bgm_eng

print("=" * 70)
print("🚀 BRAND NEW FRESH OUTPUT GENERATION — CURRENT TIME: 10:23 PM")
print("=" * 70)

# 1. Generate FRESH SFX
fresh_sfx = sfx_eng.generate_sfx("laser blast impact")

# 2. Generate FRESH VOICE
fresh_voice = voice_eng.generate_voice("Hello world! Fresh new ChatTTS voice generated right now [laugh_2]!", filename="FRESH_CHATTTS_VOICE_2026.wav")

# 3. Generate FRESH BGM
fresh_bgm = bgm_eng.generate_bgm("Epic sci-fi action movie trailer background music", filename="FRESH_META_MUSICGEN_BGM_2026.wav", duration_sec=5)

print("=" * 70)
print("🎉 ALL BRAND NEW FRESH OUTPUTS CREATED SUCCESSFULLY!")
print(f"1. FRESH Voice: {fresh_voice}")
print(f"2. FRESH SFX  : {fresh_sfx}")
print(f"3. FRESH BGM  : {fresh_bgm}")
print("=" * 70)
