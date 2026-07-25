import os
import sys
import torch
import soundfile as sf
from datetime import datetime
from transformers import AutoProcessor, MusicgenForConditionalGeneration

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_bgm(prompt_text=None, filename=None, duration_sec=8):
    print("=" * 65)
    print("🎵 BGM Engine — Meta MusicGen Background Music Generator")
    print("=" * 65)

    if not prompt_text:
        prompt_text = "Dark cinematic trailer synth drone epic orchestra"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if not filename:
        filename = f"meta_bgm_{timestamp}.wav"

    output_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(output_path):
        base, ext = os.path.splitext(filename)
        filename = f"{base}_{timestamp}{ext}"
        output_path = os.path.join(OUTPUT_DIR, filename)

    print(f"⏳ Loading Meta MusicGen (facebook/musicgen-small)...")
    processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
    model.eval()

    print(f"📝 Prompt: '{prompt_text}'")
    inputs = processor(text=[prompt_text], padding=True, return_tensors="pt")
    
    max_tokens = int(duration_sec * 50)
    audio_values = model.generate(**inputs, max_new_tokens=max_tokens)
    sampling_rate = model.config.audio_encoder.sampling_rate

    sf.write(output_path, audio_values[0, 0].cpu().numpy(), sampling_rate)
    
    abs_path = os.path.abspath(output_path)
    size_kb = os.path.getsize(abs_path) / 1024
    print("=" * 65)
    print(f"🎉 New BGM File Created: {abs_path}")
    print(f"📊 Size: {size_kb:.2f} KB")
    print("=" * 65)
    return abs_path

if __name__ == "__main__":
    prompt_arg = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else None
    generate_bgm(prompt_arg)
