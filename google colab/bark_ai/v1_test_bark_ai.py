"""
Bark AI v1 — HuggingFace GPU TTS
==================================
সম্পূর্ণ GPU-ভিত্তিক। কোনো ক্লাউড API নয়।
Model: suno/bark-small
"""
SCRIPT = r'''#!/usr/bin/env python3
import os, time
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

os.system("pip install -q transformers accelerate scipy optimum 2>&1 | tail -1")

import torch, scipy.io.wavfile, numpy as np
from transformers import AutoProcessor, BarkModel

print(f"Bark AI v1: GPU={torch.cuda.get_device_name(0)}")
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

print("Bark AI v1: Generating...")
gen("Hello! This audio was generated entirely on Google Colab Tesla T4 GPU using Bark AI model. No cloud API, pure local GPU power!", "v2/en_speaker_6", "v1_english.wav")
gen("Welcome to the voice pipeline. Everything runs on the GPU. Fast, free, and completely private.", "v2/en_speaker_9", "v1_voice2.wav")

print(f"GPU Memory: {torch.cuda.memory_allocated()/1024**2:.0f} MB")
print("Bark AI v1 complete!")
'''
