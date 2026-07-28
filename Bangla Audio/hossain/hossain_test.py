import os
from banglatts import BanglaTTS

text = "প্রাকৃতিক বা ন্যাচারাল সাউন্ডের ওপেন-সোর্স বাংলা টেক্সট-টু-স্পিচ (Bangla TTS) খুঁজলে বেশ কিছু ভালো ওপেন-সোর্স লাইব্রেরি এবং ফ্রী প্ল্যাটফর্মের অপশন পাওয়া যায়।"
save_dir = os.path.dirname(os.path.abspath(__file__))

try:
    tts = BanglaTTS(save_location=save_dir)
    out_path = tts(text, voice="female", filename="hossain_output.wav")
    print(f"Hossain BanglaTTS Generated: {out_path}")
except Exception as e:
    print(f"Error running BanglaTTS: {e}")
