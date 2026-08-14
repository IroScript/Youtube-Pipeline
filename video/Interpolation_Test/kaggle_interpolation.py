import os
import subprocess

print("=================================================================")
import sys
# ⚙️ কাস্টমাইজেশন অপশন
INPUT_VIDEO = "/kaggle/input/your-dataset/final_combined_video.mp4" # আপনার আপলোড করা ভিডিওর পাথ দিন
if not os.path.exists(INPUT_VIDEO):
    # Fallback to local or relative path for testing
    INPUT_VIDEO = "../final_combined_video.mp4"

SNIPPET_VIDEO = "original_snippet.mp4"
OUTPUT_VIDEO = "ai_interpolated_slow.mp4"

ORIGINAL_DURATION = 2.0  # আসল ভিডিওর যে অংশটি কাটবেন (সেকেন্ড)
TARGET_DURATION = 15.0   # স্লো-মোশন করার পর কাঙ্ক্ষিত দৈর্ঘ্য (সেকেন্ড)
START_TIME = "00:00:10"   # আসল ভিডিওর কত সেকেন্ড থেকে কাটা শুরু হবে

print(f"🎯 Configuration:")
print(f"   Input Video: {INPUT_VIDEO}")
print(f"   Original Duration: {ORIGINAL_DURATION}s")
print(f"   Target Duration: {TARGET_DURATION}s")
print(f"   Start Time: {START_TIME}")

if not os.path.exists(INPUT_VIDEO):
    print(f"❌ Error: Video not found at '{INPUT_VIDEO}'. Please upload your video or update the path.")
    sys.exit(1)

# স্লো-মোশন ফ্যাক্টর হিসেব করা (৭.৫ গুণ ধীরগতির জন্য ১৫ / ২ = ৭.৫)
slowdown_factor = TARGET_DURATION / ORIGINAL_DURATION
print(f"🚀 Slowdown Factor: {slowdown_factor:.2f}x (0.13x speed)")

print(f"\n✂️ [STEP 1] Extracting a {ORIGINAL_DURATION}-second test snippet from {START_TIME}...")
subprocess.run([
    "ffmpeg", "-y", "-ss", START_TIME, "-i", INPUT_VIDEO, 
    "-t", str(ORIGINAL_DURATION), "-c", "copy", SNIPPET_VIDEO
], shell=True)

if not os.path.exists(SNIPPET_VIDEO):
    print("❌ Error: Failed to extract snippet. Check if START_TIME and INPUT_VIDEO are valid.")
    sys.exit(1)

print("\n🧠 [STEP 2] Applying AI Motion Interpolation (Generating missing frames with Optical Flow)...")
print("⏳ Please wait, calculating optical flow... (Kaggle GPU-তে এটি খুবই দ্রুত হবে!)")

# setpts=slowdown_factor*PTS ভিডিওটিকে ধীর করবে। minterpolate নতুন ফ্রেম তৈরি করে ৩০ এফপিএস ধরে রাখবে।
subprocess.run([
    "ffmpeg", "-y", "-i", SNIPPET_VIDEO,
    "-filter:v", f"setpts={slowdown_factor:.2f}*PTS,minterpolate='fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1'",
    "-c:v", "libx264", "-preset", "fast", OUTPUT_VIDEO
], shell=True)

if os.path.exists(OUTPUT_VIDEO):
    print("\n=================================================================")
    print(f"✅ Success! Check the folder for '{OUTPUT_VIDEO}'")
    print(f"   Original {ORIGINAL_DURATION}s snippet saved as: {SNIPPET_VIDEO}")
    print(f"   AI Interpolated {TARGET_DURATION}s video saved as: {OUTPUT_VIDEO}")
    print("=================================================================")
else:
    print("\n❌ Error: Failed to generate interpolated video.")
