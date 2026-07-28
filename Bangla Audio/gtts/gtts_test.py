import os
from gtts import gTTS

text = "প্রাকৃতিক বা ন্যাচারাল সাউন্ডের ওপেন-সোর্স বাংলা টেক্সট-টু-স্পিচ (Bangla TTS) খুঁজলে বেশ কিছু ভালো ওপেন-সোর্স লাইব্রেরি এবং ফ্রী প্ল্যাটফর্মের অপশন পাওয়া যায়।"
save_dir = os.path.dirname(os.path.abspath(__file__))
output_file = os.path.join(save_dir, "gtts_output.mp3")

tts = gTTS(text=text, lang='bn')
tts.save(output_file)
print(f"gTTS Audio Generated: {output_file}")
