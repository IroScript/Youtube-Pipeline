import os
import sys

if sys.platform == "win32" and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_TEXT = "প্রাকৃতিক বা ন্যাচারাল সাউন্ডের ওপেন-সোর্স বাংলা টেক্সট-টু-স্পিচ (Bangla TTS) খুঁজলে বেশ কিছু ভালো ওপেন-সোর্স লাইব্রেরি এবং ফ্রী প্ল্যাটফর্মের অপশন পাওয়া যায়।"

def test_gtts():
    print("\n--- Testing gTTS ---")
    gtts_dir = os.path.join(BASE_DIR, "gtts")
    os.makedirs(gtts_dir, exist_ok=True)
    out_file = os.path.join(gtts_dir, "gtts_output.mp3")
    try:
        from gtts import gTTS
        tts = gTTS(text=TEST_TEXT, lang='bn')
        tts.save(out_file)
        print(f"[SUCCESS] gTTS Audio Created: {out_file}")
    except Exception as e:
        print(f"[ERROR] gTTS Error: {e}")

def test_hossain():
    print("\n--- Testing BanglaTTS (shhossain) ---")
    hossain_dir = os.path.join(BASE_DIR, "hossain")
    os.makedirs(hossain_dir, exist_ok=True)
    try:
        from banglatts import BanglaTTS
        tts = BanglaTTS(save_location=hossain_dir)
        out_file = tts(TEST_TEXT, voice="female", filename="hossain_output.wav")
        print(f"[SUCCESS] Hossain BanglaTTS Audio Created: {out_file}")
    except Exception as e:
        print(f"[ERROR] Hossain BanglaTTS Error: {e}")

if __name__ == "__main__":
    test_gtts()
    test_hossain()
