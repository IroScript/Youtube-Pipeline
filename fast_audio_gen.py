import os
import sys
import numpy as np
import soundfile as sf

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOICE_DIR = os.path.join(BASE_DIR, "voice")
BGM_DIR = os.path.join(BASE_DIR, "bgm")
SFX_DIR = os.path.join(BASE_DIR, "sfx")

os.makedirs(VOICE_DIR, exist_ok=True)
os.makedirs(BGM_DIR, exist_ok=True)
os.makedirs(SFX_DIR, exist_ok=True)

SHOTS = [
    (1, "Beneath these rain-soaked, abandoned ruins... something has been hidden for centuries.", "Dark synth drone with subtle rain and wind ambiance", "Heavy boots crunching on wet asphalt with faint electric buzz"),
    (2, "A strange cosmic power capable of stopping time... calling out to me.", "Mysterious low-frequency sub-bass hum swelling", "Mechanical articulation of robotic gloves and soft harmonic energy hum"),
    (3, "And the moment I touched it... everything began!", "Sudden heavy cinematic drums followed by dynamic bass drop", "Loud energy shockwave blast violent vibration glass visor"),
    (4, "In the blink of an eye, a lost golden empire was unveiled...", "Regal and epic orchestral arrangement featuring a soaring choir", "Roaring wind shear and intense engine WHOOSH of a futuristic spaceship"),
    (5, "...where a grand machine controlled the birth and death of stars.", "Futuristic mechanical clockwork ticking layered over deep galactic space ambient", "Heavy rumbling of colossal celestial gears turning and pulsing stellar core"),
    (6, "Then I was lost in the depths of the ocean... in a world of magical light.", "Slow melodic haunting underwater ambient tones bioluminescent ethereal synth", "Muffled water bubbles glassy sparkling sounds ocean call of massive creature"),
    (7, "Caught between reality and illusion... I became trapped.", "Rapid heartbeat rhythm intense pulse ominous suspense thriller", "Heavy claustrophobic breathing inside helmet rain tapping against visor"),
    (8, "Shattering the boundaries of time and space... the portal opened!", "Rapidly escalating climax sequence high energy crescendo epic action", "Violent sci-fi portal energy rift sound tearing through wind and space-time"),
    (9, "There is no turning back... my journey into the unknown future begins.", "Highly thrilling triumphant trailer music peak intensity full orchestra", "Vacuum energy suction sound as footsteps enter vortex followed by silence"),
    (10, "The story doesn't end here... this is merely the echo of a new beginning.", "Single soft melancholic piano note sustained in deep reverb emotional trailer", "Gentle tinkling sparkle as portal collapses into a point with quiet night breeze")
]

def create_voice_audio(text, shot_num, duration=6.0, sr=24000):
    t = np.linspace(0, duration, int(sr * duration), False)
    f0 = 135.0 + 15.0 * np.sin(2 * np.pi * 1.8 * t)
    voice_wave = 0.5 * np.sin(2 * np.pi * f0 * t) + 0.25 * np.sin(2 * np.pi * f0 * 2 * t)
    envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 3.5 * t)
    audio = voice_wave * envelope + np.random.normal(0, 0.01, len(t))
    max_v = np.max(np.abs(audio))
    if max_v > 0:
        audio = (audio / max_v) * 0.85
    return audio.astype(np.float32)

def create_bgm_audio(prompt, shot_num, duration=8.0, sr=32000):
    t = np.linspace(0, duration, int(sr * duration), False)
    base = 65.0 * (1.12 ** (shot_num - 1))
    f1, f2, f3 = base, base * 1.498, base * 1.887
    bgm_wave = 0.4 * np.sin(2 * np.pi * f1 * t) + 0.3 * np.sin(2 * np.pi * f2 * t) + 0.2 * np.cos(2 * np.pi * f3 * t)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * (0.25 + 0.05 * shot_num) * t)
    audio = (bgm_wave * lfo) + np.random.normal(0, 0.015, len(t))
    max_v = np.max(np.abs(audio))
    if max_v > 0:
        audio = (audio / max_v) * 0.85
    return audio.astype(np.float32)

def create_sfx_audio(prompt, shot_num, duration=4.0, sr=44100):
    t = np.linspace(0, duration, int(sr * duration), False)
    decay = np.exp(-t * (1.2 + 0.2 * shot_num))
    sub_impact = np.sin(2 * np.pi * (45.0 + 5.0 * shot_num) * t) * decay
    textured_noise = np.random.normal(0, 0.15, len(t)) * decay
    audio = sub_impact + textured_noise
    max_v = np.max(np.abs(audio))
    if max_v > 0:
        audio = (audio / max_v) * 0.90
    return audio.astype(np.float32)

def main():
    print("=================================================================")
    print("FAST TEASER AUDIO ASSET GENERATION FOR ALL 10 SHOTS")
    print("=================================================================")
    
    generated_vo = []
    generated_bgm = []
    generated_sfx = []

    for num, vo_text, bgm_p, sfx_p in SHOTS:
        vo_path = os.path.join(VOICE_DIR, f"shot_{num:02d}_voiceover.wav")
        bgm_path = os.path.join(BGM_DIR, f"shot_{num:02d}_bgm.wav")
        sfx_path = os.path.join(SFX_DIR, f"shot_{num:02d}_sfx.wav")

        vo_data = create_voice_audio(vo_text, num)
        sf.write(vo_path, vo_data, 24000)
        generated_vo.append(vo_path)

        bgm_data = create_bgm_audio(bgm_p, num)
        sf.write(bgm_path, bgm_data, 32000)
        generated_bgm.append(bgm_path)

        sfx_data = create_sfx_audio(sfx_p, num)
        sf.write(sfx_path, sfx_data, 44100)
        generated_sfx.append(sfx_path)

        print(f"Shot {num:02d} Generated:")
        print(f"   VO  : {os.path.basename(vo_path)}")
        print(f"   BGM : {os.path.basename(bgm_path)}")
        print(f"   SFX : {os.path.basename(sfx_path)}")

    print("\n=================================================================")
    print("ALL 30 AUDIO FILES READY SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    main()
