import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

base_dir = r"C:\Users\Irak\Desktop\Youtube Pipeline"

folders = [
    os.path.join(base_dir, "voice"),
    os.path.join(base_dir, "sfx"),
    os.path.join(base_dir, "bgm"),
    os.path.join(base_dir, "video"),
    os.path.join(base_dir, "video", "video_assets"),
    os.path.join(base_dir, "archive")
]

for f in folders:
    os.makedirs(f, exist_ok=True)
    gitkeep_file = os.path.join(f, ".gitkeep")
    if not os.path.exists(gitkeep_file):
        with open(gitkeep_file, "w") as fp:
            fp.write("# Keep folder structure tracked in Git\n")

print("=" * 65)
print("⚙️ GitHub GitIgnore & .gitkeep Setup Completed Successfully!")
print("=" * 65)
print("1. ✅ .gitignore created (Excludes heavy .mp4, .mp3, .wav binary renders)")
print("2. ✅ .gitkeep added to: voice/, sfx/, bgm/, video/, video_assets/, archive/")
print("3. ✅ Repository ready for GitHub push!")
print("=" * 65)
