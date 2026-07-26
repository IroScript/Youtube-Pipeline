"""
Edge-TTS v3 — Movie Dialogues (Hindi, Bangla, Hollywood)
=========================================================
1. Sholay - Gabbar Singh (Hindi)
2. Ammajan - Manna (Bangla)
3. Gladiator - Maximus (English)
"""
SCRIPT = r'''#!/usr/bin/env python3
import asyncio, edge_tts, os

os.makedirs("/content/omnivoice/edge_tts", exist_ok=True)

HINDI = "Kitne aadmi the? ... Do? ... Aur tum teen! ... Phir bhi wapas aa gaye... Khaali haath!"
BANGLA = "আম্মাজান! আপনি শুধু একটা বার নির্দেশ দেন, আজ পুরো পৃথিবীকে আমি আপনার পায়ের নিচে এনে হাজির করব!"
ENGLISH = "My name is Maximus Decimus Meridius, commander of the Armies of the North, General of the Felix Legions, and loyal servant to the true emperor, Marcus Aurelius. Father to a murdered son, husband to a murdered wife. And I will have my vengeance, in this life or the next."

async def generate():
    print("v3: Sholay - Gabbar (hi-IN-MadhurNeural)...")
    await edge_tts.Communicate(HINDI, "hi-IN-MadhurNeural").save("/content/omnivoice/edge_tts/v3_sholay_gabbar_hindi.mp3")

    print("v3: Ammajan - Manna (bn-BD-PradeepNeural)...")
    await edge_tts.Communicate(BANGLA, "bn-BD-PradeepNeural").save("/content/omnivoice/edge_tts/v3_ammajan_manna_bangla.mp3")

    print("v3: Gladiator - Maximus (en-US-GuyNeural)...")
    await edge_tts.Communicate(ENGLISH, "en-US-GuyNeural").save("/content/omnivoice/edge_tts/v3_gladiator_maximus_english.mp3")

asyncio.run(generate())
print("Edge-TTS v3 complete!")
'''
