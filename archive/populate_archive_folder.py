import os
import sys
import shutil

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

base_dir = r"C:\Users\Irak\Desktop\Youtube Pipeline"
archive_dir = os.path.join(base_dir, "archive")
os.makedirs(archive_dir, exist_ok=True)

# Copy all sample files from voice/, sfx/, bgm/ into archive/ as backup copies
for folder in ["voice", "sfx", "bgm"]:
    f_path = os.path.join(base_dir, folder)
    if os.path.exists(f_path):
        for item in os.listdir(f_path):
            src_item = os.path.join(f_path, item)
            dst_item = os.path.join(archive_dir, f"{folder}_{item}")
            if os.path.isfile(src_item) and not os.path.exists(dst_item):
                shutil.copy2(src_item, dst_item)

print(f"✅ Archive folder fully populated with reference copies at: {archive_dir}")
