import os
import sys
import shutil

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

src_folder = r"C:\Users\Irak\Downloads\test_prompt1"
dst_folder = r"C:\Users\Irak\Desktop\Youtube Pipeline"

os.makedirs(dst_folder, exist_ok=True)
os.makedirs(os.path.join(dst_folder, "archive"), exist_ok=True)

# 1. Copy all current items to Desktop Youtube Pipeline
for item in os.listdir(src_folder):
    s = os.path.join(src_folder, item)
    d = os.path.join(dst_folder, item)
    if os.path.isdir(s):
        if not os.path.exists(d):
            shutil.copytree(s, d)
    else:
        shutil.copy2(s, d)

print(f"✅ All items successfully copied to Desktop Youtube Pipeline: {dst_folder}")

# 2. Safely delete C:\Users\Irak\Downloads\test_prompt1
try:
    # Remove script first then folder
    shutil.rmtree(src_folder, ignore_errors=True)
    print(f"🗑️ Successfully deleted source folder: {src_folder}")
except Exception as e:
    print(f"Note on deleting downloads folder: {e}")

print("=" * 70)
print(f"📂 Desktop Youtube Pipeline Active Location: {dst_folder}")
print("=" * 70)
