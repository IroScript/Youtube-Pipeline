import os
import sys

# Safe stdout encoding for Windows console
if sys.platform == "win32" and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

TEXT = "প্রাকৃতিক বা ন্যাচারাল সাউন্ডের ওপেন-সোর্স বাংলা টেক্সট-টু-স্পিচ (Bangla TTS) খুঁজলে বেশ কিছু ভালো ওপেন-সোর্স লাইব্রেরি এবং ফ্রী প্ল্যাটফর্মের অপশন পাওয়া যায়।"
save_dir = os.path.dirname(os.path.abspath(__file__))
out_file = os.path.join(save_dir, "ai4bharat_output.wav")

try:
    from transformers import VitsModel, AutoTokenizer
    import torch
    import soundfile as sf

    print("Loading AI4Bharat / Meta MMS-TTS Bangla VITS model...")
    model_id = "facebook/mms-tts-ben"
    model = VitsModel.from_pretrained(model_id)
    tokenizer = AutoTokenizer.from_pretrained(model_id)

    inputs = tokenizer(TEXT, return_tensors="pt")

    with torch.no_grad():
        output = model(**inputs).waveform

    sf.write(out_file, output.numpy().squeeze(), model.config.sampling_rate)
    print(f"[SUCCESS] AI4Bharat / MMS Bangla Audio Generated: {out_file}")

except Exception as e:
    print(f"[ERROR] AI4Bharat MMS-TTS Error: {e}")
