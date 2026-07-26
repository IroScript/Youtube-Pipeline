"""
STEP 3: Generate all 10 SFX tracks from Freesound.
Each shot gets its own sound effect MP3 file.
"""
import sys
import os
import shutil

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add project root to path so we can import sfx_engine
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from sfx.sfx_engine import generate_sfx

SFX_DIR = os.path.join(PROJECT_ROOT, "sfx")
os.makedirs(SFX_DIR, exist_ok=True)

SFX_PROMPTS = [
    (1,  "heavy boots crunching wet asphalt"),
    (2,  "robotic mechanical servo glove movement"),
    (3,  "energy shockwave explosion blast"),
    (4,  "futuristic spaceship whoosh flyby"),
    (5,  "heavy gears turning rumbling machinery"),
    (6,  "underwater bubbles ocean deep sea"),
    (7,  "heavy breathing inside helmet claustrophobic"),
    (8,  "sci-fi portal energy rift opening"),
    (9,  "vacuum suction wind vortex swoosh"),
    (10, "sparkle shimmer magical chime breeze"),
]

def main():
    print("=" * 65)
    print("STEP 3: Freesound SFX Generation (10 Shots)")
    print("=" * 65)

    for shot_num, prompt in SFX_PROMPTS:
        final_path = os.path.join(SFX_DIR, f"shot_{shot_num:02d}_sfx.mp3")
        print(f"\n--- Shot {shot_num:02d} SFX ---")
        print(f"Search query: \"{prompt}\"")
        print("Searching Freesound...")

        result = generate_sfx(raw_prompt=prompt)

        if result and os.path.exists(result):
            # Copy to clean shot-named file
            if os.path.abspath(result) != os.path.abspath(final_path):
                shutil.copy2(result, final_path)
            size_kb = os.path.getsize(final_path) / 1024
            print(f"SAVED: {final_path}")
            print(f"Size: {size_kb:.1f} KB")
        else:
            print(f"WARNING: Could not find SFX for Shot {shot_num:02d}. Skipping.")

    print("\n" + "=" * 65)
    print("SFX GENERATION COMPLETE!")
    print(f"Output folder: {SFX_DIR}")
    print("=" * 65)

if __name__ == "__main__":
    main()
