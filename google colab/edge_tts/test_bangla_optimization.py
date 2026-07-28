import asyncio
import edge_tts

# SSML formatted text with rate, pitch, and prosody adjustments
SSML_TEXT_PRADEEP = """<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='bn-BD'>
    <voice name='bn-BD-PradeepNeural'>
        <prosody rate='-5%' pitch='+0Hz'>
            আম্মাজান! <break time='400ms'/> আপনি শুধু একটা বার নির্দেশ দেন, <break time='300ms'/> আজ পুরো পৃথিবীকে আমি আপনার পায়ের নিচে এনে হাজির করব!
        </prosody>
    </voice>
</speak>"""

SSML_TEXT_NABANITA = """<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='bn-BD'>
    <voice name='bn-BD-NabanitaNeural'>
        <prosody rate='-4%' pitch='-2Hz'>
            আম্মাজান! <break time='400ms'/> আপনি শুধু একটা বার নির্দেশ দেন, <break time='300ms'/> আজ পুরো পৃথিবীকে আমি আপনার পায়ের নিচে এনে হাজির করব!
        </prosody>
    </voice>
</speak>"""

SSML_TEXT_BASHKAR = """<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='bn-IN'>
    <voice name='bn-IN-BashkarNeural'>
        <prosody rate='-5%' pitch='+0Hz'>
            আম্মাজান! <break time='400ms'/> আপনি শুধু একটা বার নির্দেশ দেন, <break time='300ms'/> আজ পুরো পৃথিবীকে আমি আপনার পায়ের নিচে এনে হাজির করব!
        </prosody>
    </voice>
</speak>"""

SSML_TEXT_TANISHAA = """<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='bn-IN'>
    <voice name='bn-IN-TanishaaNeural'>
        <prosody rate='-5%' pitch='-1Hz'>
            আম্মাজান! <break time='400ms'/> আপনি শুধু একটা বার নির্দেশ দেন, <break time='300ms'/> আজ পুরো পৃথিবীকে আমি আপনার পায়ের নিচে এনে হাজির করব!
        </prosody>
    </voice>
</speak>"""

async def main():
    print("Generating Pradeep SSML...")
    c1 = edge_tts.Communicate(SSML_TEXT_PRADEEP, "bn-BD-PradeepNeural")
    await c1.save("v4_pradeep_ssml.mp3")

    print("Generating Nabanita SSML...")
    c2 = edge_tts.Communicate(SSML_TEXT_NABANITA, "bn-BD-NabanitaNeural")
    await c2.save("v4_nabanita_ssml.mp3")

    print("Generating Bashkar SSML...")
    c3 = edge_tts.Communicate(SSML_TEXT_BASHKAR, "bn-IN-BashkarNeural")
    await c3.save("v4_bashkar_ssml.mp3")

    print("Generating Tanishaa SSML...")
    c4 = edge_tts.Communicate(SSML_TEXT_TANISHAA, "bn-IN-TanishaaNeural")
    await c4.save("v4_tanishaa_ssml.mp3")

    print("All Bangla Edge-TTS SSML tests generated!")

if __name__ == "__main__":
    asyncio.run(main())
