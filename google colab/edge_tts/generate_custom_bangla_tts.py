import sys
import os
import re
import asyncio
import datetime
import edge_tts

# Safe stdout encoding for Windows console
if sys.platform == "win32" and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def clean_markdown_for_tts(text: str) -> str:
    """Cleans markdown syntax, links, URLs, and bullet points so TTS speaks naturally."""
    # 1. Remove markdown links [Link Text](URL) -> Link Text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # 2. Remove standalone URLs
    text = re.sub(r'https?://\S+', '', text)
    # 3. Remove citations like [1], [1, 2, 3]
    text = re.sub(r'\[\d+(?:,\s*\d+)*\]', '', text)
    
    cleaned_lines = []
    for line in text.splitlines():
        line = line.strip()
        # Remove headers (##), bullets (*, -, >), numbers (1., 2.) at start of line
        line = re.sub(r'^(?:#+|\*+|-+|>+|\d+\.)\s*', '', line)
        if line:
            cleaned_lines.append(line)
            
    return "\n".join(cleaned_lines)

async def generate_bangla_audio(text: str, output_filename: str = None, voice: str = "bn-BD-PradeepNeural", rate: str = "-5%", pitch: str = "+0Hz"):
    """
    Generates optimized Bangla audio using Microsoft Edge-TTS with SSML tuning.
    All outputs are strictly saved inside the google colab/edge_tts directory.
    """
    cleaned_text = clean_markdown_for_tts(text)
    if not cleaned_text.strip():
        print("No readable text found.")
        return

    # Insert pauses for natural prosody
    formatted_text = cleaned_text.replace(",", ", <break time='250ms'/>").replace("।", "। <break time='400ms'/>").replace("!", "! <break time='400ms'/>").replace("?", "? <break time='400ms'/>")
    
    ssml_text = f"""<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='bn-BD'>
    <voice name='{voice}'>
        <prosody rate='{rate}' pitch='{pitch}'>
            {formatted_text}
        </prosody>
    </voice>
</speak>"""

    current_dir = os.path.dirname(os.path.abspath(__file__))
    if not output_filename:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"bangla_audio_{timestamp}.mp3"
        
    output_path = os.path.join(current_dir, output_filename)

    communicate = edge_tts.Communicate(ssml_text, voice)
    await communicate.save(output_path)
    print(f"\n[SUCCESS] Audio generated successfully!")
    print(f"[FILE PATH] {output_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_text = " ".join(sys.argv[1:])
    else:
        print("="*60)
        print(" MICROSOFT EDGE-TTS BANGLA GENERATOR (MULTI-LINE SUPPORT)")
        print("="*60)
        print("Paste your text below.")
        print("(Press Ctrl+Z then Enter when finished pasting):")
        print("-" * 60)
        user_text = sys.stdin.read()
    
    asyncio.run(generate_bangla_audio(user_text))
