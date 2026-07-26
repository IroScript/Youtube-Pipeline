"""
Edge-TTS v2 — McCullen Nanomites Dialogue
===========================================
G.I. Joe movie dialogue test।
"""
SCRIPT = r'''#!/usr/bin/env python3
import asyncio, edge_tts, os

os.makedirs("/content/omnivoice/edge_tts", exist_ok=True)

DIALOGUE = "Nanomites... programmed to devour metal, steel, flesh. But more importantly, they can be programmed to stop. The real-world applications are endless... So, you tell me... is it working?"

async def generate():
    # Deep male voice
    print("Edge-TTS v2: Guy (en-US-GuyNeural)...")
    await edge_tts.Communicate(DIALOGUE, "en-US-GuyNeural").save("/content/omnivoice/edge_tts/v2_guy.mp3")
    
    # Another dramatic voice
    print("Edge-TTS v2: Davis (en-US-DavisNeural)...")
    await edge_tts.Communicate(DIALOGUE, "en-US-DavisNeural").save("/content/omnivoice/edge_tts/v2_davis.mp3")

asyncio.run(generate())
print("Edge-TTS v2 complete!")
'''
