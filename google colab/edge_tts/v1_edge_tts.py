"""
Edge-TTS v1 — Microsoft Cloud TTS
===================================
GPU ব্যবহার করে না। Microsoft-এর ক্লাউড সার্ভিস।
Bangla ও English ভয়েস সাপোর্ট করে।
"""
SCRIPT = r'''#!/usr/bin/env python3
import asyncio, edge_tts, os

os.makedirs("/content/omnivoice/edge_tts", exist_ok=True)

async def generate():
    print("Edge-TTS v1: Bangla generating...")
    await edge_tts.Communicate(
        "আসসালামু আলাইকুম! এটি এজ টিটিএস দিয়ে তৈরি করা একটি স্যাম্পল অডিও। মাইক্রোসফটের ক্লাউড সার্ভিস ব্যবহার করা হয়েছে।",
        "bn-BD-NabanitaNeural"
    ).save("/content/omnivoice/edge_tts/v1_bangla.mp3")
    print("Edge-TTS v1: English generating...")
    await edge_tts.Communicate(
        "Hello! This is Edge TTS version one sample. It uses Microsoft cloud service, not the local GPU. The voice quality is quite natural.",
        "en-US-AriaNeural"
    ).save("/content/omnivoice/edge_tts/v1_english.mp3")

asyncio.run(generate())
print("Edge-TTS v1 complete!")
'''
