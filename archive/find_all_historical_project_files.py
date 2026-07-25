import os
import sys
import shutil

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

search_roots = [
    r"C:\Users\Irak\Downloads",
    r"C:\Users\Irak\Desktop",
    r"C:\Users\Irak\.terminal-logs",
    r"C:\Users\Irak\.gemini\antigravity-cli\brain",
    r"C:\Users\Irak\AppData\Local\Temp"
]

target_extensions = {".wav", ".mp3", ".mp4", ".png", ".jpg", ".py", ".jsonl", ".txt"}
keywords = ["shot", "bgm", "sfx", "voice", "chattts", "audioldm", "musicgen", "test_prompt", "selected_shots", "demo", "sample"]

found_files = []

for root_dir in search_roots:
    if not os.path.exists(root_dir):
        continue
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext in target_extensions:
                f_lower = f.lower()
                if any(kw in f_lower for kw in keywords):
                    full_p = os.path.join(dirpath, f)
                    found_files.append((f, full_p, os.path.getsize(full_p)))

print("=" * 70)
print(f"🔍 TOTAL HISTORICAL FILES FOUND ACROSS SYSTEM: {len(found_files)}")
print("=" * 70)

archive_dst = r"C:\Users\Irak\Desktop\Youtube Pipeline\archive"
os.makedirs(archive_dst, exist_ok=True)

copied_count = 0
for f_name, f_path, f_size in found_files:
    if "Youtube Pipeline" in f_path and r"Youtube Pipeline\archive" in f_path:
        continue
    dst_f = os.path.join(archive_dst, f_name)
    if os.path.exists(dst_f):
        base, ext = os.path.splitext(f_name)
        dst_f = os.path.join(archive_dst, f"{base}_{copied_count}{ext}")
    try:
        shutil.copy2(f_path, dst_f)
        copied_count += 1
    except Exception as e:
        pass

print(f"✅ Successfully restored & gathered {copied_count} historical files into archive: {archive_dst}")
print("=" * 70)
