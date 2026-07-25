import os
import re
import sys
import random
import shutil
import hashlib
import cv2
from datetime import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_file_hash(file_path):
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def process_shot_videos(source_dir=None, output_folder="selected_shots", output_combined_video=None):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    if not source_dir:
        source_dir = os.path.join(base_dir, "video_assets")
        
    if not os.path.exists(source_dir):
        source_dir = base_dir

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if not output_combined_video:
        output_combined_video = f"final_combined_video_{timestamp}.mp4"

    combined_output_path = os.path.join(base_dir, output_combined_video)
    if os.path.exists(combined_output_path):
        base, ext = os.path.splitext(output_combined_video)
        output_combined_video = f"{base}_{timestamp}{ext}"
        combined_output_path = os.path.join(base_dir, output_combined_video)

    print("=" * 65)
    print("🎬 শট নির্বাচন ও ভিডিও কনক্যাটেনেশন প্রসেস শুরু হচ্ছে...")
    print(f"📂 ভিডিও স্ক্যান ডিরেক্টরি: {source_dir}")
    print("=" * 65)

    search_dirs = [source_dir]
    dest_path = os.path.join(base_dir, output_folder)
    if os.path.exists(dest_path):
        search_dirs.append(dest_path)

    shot_groups = {}
    shot_pattern = re.compile(r'^(\d+)_Shot-.*\.mp4$', re.IGNORECASE)

    for d in search_dirs:
        if not os.path.exists(d):
            continue
        for file_name in os.listdir(d):
            full_path = os.path.join(d, file_name)
            if os.path.isfile(full_path):
                match = shot_pattern.match(file_name)
                if match:
                    shot_num = int(match.group(1))
                    if shot_num not in shot_groups:
                        shot_groups[shot_num] = []
                    shot_groups[shot_num].append(full_path)

    if not shot_groups:
        print("❌ কোনো শট ভিডিও ফাইল পাওয়া যায়নি!")
        return

    print(f"✅ মোট {len(shot_groups)} টি শট পাওয়া গেছে:\n")
    for shot_num in sorted(shot_groups.keys()):
        file_names = [os.path.basename(p) for p in shot_groups[shot_num]]
        print(f"   • Shot {shot_num:02d}: {len(shot_groups[shot_num])} টি ভ্যারিয়েন্ট পাওয়া গেছে -> {file_names}")

    os.makedirs(dest_path, exist_ok=True)
    selected_files = []
    print("\n🎲 প্রতিটি শট থেকে ১টি ভিডিও র‍্যান্ডম সিলেক্ট করা হচ্ছে:")
    
    for shot_num in sorted(shot_groups.keys()):
        chosen_path = random.choice(shot_groups[shot_num])
        chosen_file = os.path.basename(chosen_path)
        dst_file_path = os.path.join(dest_path, chosen_file)

        if os.path.abspath(chosen_path) != os.path.abspath(dst_file_path):
            shutil.copy2(chosen_path, dst_file_path)

        selected_files.append((shot_num, dst_file_path))
        print(f"   ► Shot {shot_num:02d}: চয়নকৃত ফাইল -> '{chosen_file}'")

    print("\n🎞️ নির্বাচিত ভিডিওগুলো জোড়া লাগিয়ে ফাইনাল ভিডিও তৈরি করা হচ্ছে...")
    first_video_path = selected_files[0][1]
    cap = cv2.VideoCapture(first_video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.release()

    if fps == 0 or width == 0 or height == 0:
        fps = 24.0
        width, height = 720, 1280

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(combined_output_path, fourcc, fps, (width, height))

    total_frames_written = 0
    for shot_num, video_path in selected_files:
        file_name = os.path.basename(video_path)
        print(f"   ▶️ প্রসেস করা হচ্ছে: Shot {shot_num:02d} ({file_name})...")
        cap = cv2.VideoCapture(video_path)
        
        frames_in_shot = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height))
                
            writer.write(frame)
            frames_in_shot += 1
            total_frames_written += 1
        
        cap.release()
        print(f"      - {frames_in_shot} টি ফ্রেম যুক্ত করা হয়েছে।")

    writer.release()

    print("\n" + "=" * 65)
    print("🎉 নতুন ভেরিফাইড ভিডিও ফাইল সফলভাবে প্রস্তুত!")
    print(f"📁 সিলেক্টেড শট ফোল্ডার: {dest_path}")
    print(f"🎥 ফাইনাল ভিডিও আউটপুট: {combined_output_path}")
    print(f"📊 মোট ফ্রেম: {total_frames_written} ({total_frames_written/fps:.2f} সেকেন্ড)")
    print("=" * 65)

if __name__ == "__main__":
    process_shot_videos()
