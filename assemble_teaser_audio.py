import os
import sys
import glob
import soundfile as sf
import numpy as np

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOICE_DIR = os.path.join(BASE_DIR, "voice")
BGM_DIR = os.path.join(BASE_DIR, "bgm")
SFX_DIR = os.path.join(BASE_DIR, "sfx")
OUTPUT_DIR = os.path.join(BASE_DIR, "audio_output")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def mix_shot_audio(shot_num):
    vo_path = os.path.join(VOICE_DIR, f"shot_{shot_num:02d}_voiceover.wav")
    bgm_path = os.path.join(BGM_DIR, f"shot_{shot_num:02d}_bgm.wav")
    sfx_path = os.path.join(SFX_DIR, f"shot_{shot_num:02d}_sfx.wav")
    if not os.path.exists(sfx_path):
        sfx_path = os.path.join(SFX_DIR, f"shot_{shot_num:02d}_sfx.mp3")

    print(f"Mixing Audio for Shot {shot_num:02d}...")

    target_sr = 24000
    total_samples = int(target_sr * 8.0)

    mixed_audio = np.zeros(total_samples, dtype=np.float32)

    if os.path.exists(bgm_path):
        try:
            bgm, sr = sf.read(bgm_path)
            if len(bgm.shape) > 1:
                bgm = np.mean(bgm, axis=1)
            if len(bgm) > total_samples:
                bgm = bgm[:total_samples]
            else:
                bgm = np.pad(bgm, (0, total_samples - len(bgm)))
            mixed_audio += bgm * 0.35
        except Exception as e:
            print(f"   Could not load BGM: {e}")

    if os.path.exists(sfx_path):
        try:
            sfx, sr = sf.read(sfx_path)
            if len(sfx.shape) > 1:
                sfx = np.mean(sfx, axis=1)
            if len(sfx) > total_samples:
                sfx = sfx[:total_samples]
            else:
                sfx = np.pad(sfx, (0, total_samples - len(sfx)))
            mixed_audio += sfx * 0.40
        except Exception as e:
            print(f"   Could not load SFX: {e}")

    if os.path.exists(vo_path):
        try:
            vo, sr = sf.read(vo_path)
            if len(vo.shape) > 1:
                vo = np.mean(vo, axis=1)
            if len(vo) > total_samples:
                vo = vo[:total_samples]
            else:
                vo = np.pad(vo, (0, total_samples - len(vo)))
            mixed_audio += vo * 0.90
        except Exception as e:
            print(f"   Could not load VO: {e}")

    max_val = np.max(np.abs(mixed_audio))
    if max_val > 0:
        mixed_audio = mixed_audio / max_val * 0.95

    out_file = os.path.join(OUTPUT_DIR, f"shot_{shot_num:02d}_mixed_master.wav")
    sf.write(out_file, mixed_audio, target_sr)
    print(f"   Exported Shot {shot_num:02d} Mixed Audio -> {out_file}")
    return out_file

def mix_full_teaser():
    master_shots = []
    for shot in range(1, 11):
        shot_master = mix_shot_audio(shot)
        master_shots.append(shot_master)

    combined_audio = []
    sr = 24000
    for file_path in master_shots:
        data, _ = sf.read(file_path)
        combined_audio.append(data)

    full_teaser = np.concatenate(combined_audio)
    out_teaser = os.path.join(OUTPUT_DIR, "full_80sec_teaser_audio_master.wav")
    sf.write(out_teaser, full_teaser, sr)
    print("\n=================================================================")
    print(f"FULL 80-SECOND MASTER TEASER AUDIO CREATED: {out_teaser}")
    print("=================================================================")

if __name__ == "__main__":
    mix_full_teaser()
