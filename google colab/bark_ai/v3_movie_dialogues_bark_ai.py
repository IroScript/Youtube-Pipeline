"""
Bark AI v3 — Movie Dialogues (Hindi, Bangla, Hollywood)
========================================================
1. Sholay - Gabbar Singh (Hindi) - menacing, raspy
2. Ammajan - Manna (Bangla) - emotional, booming
3. Gladiator - Maximus (English) - steely, commanding
Note: Bark handles English best. Hindi/Bangla may have accent variations.
"""
SCRIPT = r'''#!/usr/bin/env python3
import os, time
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

os.system("pip install -q transformers accelerate scipy optimum 2>&1 | tail -1")

import torch, scipy.io.wavfile, numpy as np
from transformers import AutoProcessor, BarkModel

print(f"Bark AI v3: GPU={torch.cuda.get_device_name(0)}")
start = time.time()
processor = AutoProcessor.from_pretrained("suno/bark-small")
model = BarkModel.from_pretrained("suno/bark-small").to("cuda")
print(f"Model loaded in {time.time()-start:.0f}s")

os.makedirs("/content/omnivoice/bark_ai", exist_ok=True)
sr = model.generation_config.sample_rate

def gen(text, preset, filename):
    t = time.time()
    inputs = processor(text, voice_preset=preset)
    inputs = {k: v.to("cuda") for k, v in inputs.items()}
    with torch.no_grad():
        audio = model.generate(**inputs)
    arr = audio.cpu().numpy().squeeze()
    scipy.io.wavfile.write(f"/content/omnivoice/bark_ai/{filename}", rate=sr, data=(arr * 32767).astype(np.int16))
    print(f"  {filename} done in {time.time()-t:.0f}s")

print("Bark AI v3: Movie dialogues generating...")

# Sholay - Gabbar (menacing voice)
gen("Kitne aadmi the? ... Do? ... Aur tum teen! Phir bhi wapas aa gaye... Khaali haath!",
    "v2/en_speaker_3", "v3_sholay_gabbar_hindi.wav")

# Ammajan - Manna (deep booming voice)
gen("Ammajan! You just give me the order once, and today I will bring the entire world to your feet!",
    "v2/en_speaker_6", "v3_ammajan_manna_bangla_en.wav")

# Gladiator - Maximus (steely commanding voice)
gen("My name is Maximus Decimus Meridius, commander of the Armies of the North, General of the Felix Legions, and loyal servant to the true emperor, Marcus Aurelius.",
    "v2/en_speaker_0", "v3_gladiator_maximus_part1.wav")
gen("Father to a murdered son, husband to a murdered wife. And I will have my vengeance, in this life or the next.",
    "v2/en_speaker_0", "v3_gladiator_maximus_part2.wav")

print(f"GPU Memory: {torch.cuda.memory_allocated()/1024**2:.0f} MB")
print("Bark AI v3 complete!")
'''
