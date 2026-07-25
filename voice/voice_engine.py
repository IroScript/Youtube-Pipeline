import ChatTTS
import sys
import os
import torch
import soundfile as sf
from datetime import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_voice(prompt_text=None, filename=None, male_seed=2222):
    print("=" * 65)
    print("🎙️ Voice Engine — ChatTTS Offline Voice Generator")
    print("=" * 65)

    if not prompt_text:
        prompt_text = "Hello my friends! I am ChatTTS. Listen carefully as I talk and laugh [laugh_2]! Ha ha ha, isn't this absolutely hilarious [laugh_0]? Everything is running completely offline [uv_break]!"

    # ALWAYS generate a unique timestamped filename — NEVER overwrite existing files
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if not filename:
        filename = f"voice_chattts_{timestamp}.wav"

    output_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(output_path):
        base, ext = os.path.splitext(filename)
        filename = f"{base}_{timestamp}{ext}"
        output_path = os.path.join(OUTPUT_DIR, filename)

    chat = ChatTTS.Chat()
    print("⏳ Loading ChatTTS Model...")
    chat.load(source="huggingface", compile=False)

    print(f"📝 Prompt: '{prompt_text}'")
    
    if male_seed:
        torch.manual_seed(male_seed)
        rand_spk = chat.sample_random_speaker()
    else:
        rand_spk = chat.sample_random_speaker()
    
    params_infer_code = ChatTTS.Chat.InferCodeParams(
        spk_emb=rand_spk,
        prompt='[speed_3]'
    )
    params_refine_text = ChatTTS.Chat.RefineTextParams(
        prompt='[to_break_0]'
    )
    
    wavs = chat.infer([prompt_text], params_infer_code=params_infer_code, params_refine_text=params_refine_text)
    
    audio_data = wavs[0]
    if isinstance(audio_data, torch.Tensor):
        audio_data = audio_data.cpu().numpy()
    
    if len(audio_data.shape) > 1:
        audio_data = audio_data.squeeze()
        
    sf.write(output_path, audio_data, 24000)

    duration = len(audio_data) / 24000
    abs_path = os.path.abspath(output_path)
    size_kb = os.path.getsize(abs_path) / 1024

    print("=" * 65)
    print(f"🎉 New Voice File Created: {abs_path}")
    print(f"⏱️ Duration: {duration:.2f}s | Size: {size_kb:.2f} KB")
    print("=" * 65)
    return abs_path

if __name__ == "__main__":
    text_arg = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else None
    generate_voice(text_arg)
