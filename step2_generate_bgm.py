"""
STEP 2: Generate all 10 BGM tracks using Meta MusicGen.
Each shot gets its own 8-second background music WAV file.
"""
import os
import sys
import torch
import soundfile as sf
from transformers import AutoProcessor, MusicgenForConditionalGeneration

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BGM_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bgm")
os.makedirs(BGM_DIR, exist_ok=True)

BGM_PROMPTS = [
    (1,  "Dark synth drone subtle rain wind ambiance cinematic thriller"),
    (2,  "Mysterious low frequency sub bass hum swell sci-fi suspense"),
    (3,  "Heavy cinematic drums dynamic bass drop epic trailer impact"),
    (4,  "Regal epic orchestral soaring choir golden empire brass fanfare"),
    (5,  "Futuristic mechanical clockwork ticking deep galactic space ambient"),
    (6,  "Slow melodic haunting underwater ambient tones ethereal synth pad"),
    (7,  "Rapid heartbeat rhythm intense pulse ominous suspense thriller"),
    (8,  "Rapidly escalating climax sequence high energy crescendo action"),
    (9,  "Thrilling triumphant trailer music peak intensity full orchestra"),
    (10, "Soft melancholic piano note sustained reverb emotional trailer outro"),
]

DURATION_SEC = 8

def main():
    print("=" * 65)
    print("STEP 2: Meta MusicGen BGM Generation (10 Shots x 8 sec)")
    print("=" * 65)

    # Load MusicGen model ONCE
    print("Loading Meta MusicGen (facebook/musicgen-small)...")
    processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
    model.eval()
    sampling_rate = model.config.audio_encoder.sampling_rate
    max_tokens = int(DURATION_SEC * 50)
    print(f"MusicGen Loaded! Sample rate: {sampling_rate}, Max tokens: {max_tokens}")

    for shot_num, prompt in BGM_PROMPTS:
        out_path = os.path.join(BGM_DIR, f"shot_{shot_num:02d}_bgm.wav")
        print(f"\n--- Shot {shot_num:02d} BGM ---")
        print(f"Prompt: \"{prompt}\"")
        print("Generating music...")

        inputs = processor(text=[prompt], padding=True, return_tensors="pt")
        audio_values = model.generate(**inputs, max_new_tokens=max_tokens)
        sf.write(out_path, audio_values[0, 0].cpu().numpy(), sampling_rate)

        size_kb = os.path.getsize(out_path) / 1024
        print(f"SAVED: {out_path}")
        print(f"Size: {size_kb:.1f} KB")

    print("\n" + "=" * 65)
    print("ALL 10 BGM TRACKS GENERATED SUCCESSFULLY!")
    print(f"Output folder: {BGM_DIR}")
    print("=" * 65)

if __name__ == "__main__":
    main()
