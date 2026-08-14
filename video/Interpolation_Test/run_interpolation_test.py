import subprocess
import os

print("[TEST] Starting Frame Interpolation Test...")

input_video = r"..\final_combined_video.mp4"
snippet_video = "original_snippet.mp4"
output_video = "ai_interpolated_slow.mp4"

# Step 1: Extract a 2-second snippet from the main video to test quickly
print("\n[STEP 1] Extracting a 2-second test snippet...")
subprocess.run([
    "ffmpeg", "-y", "-ss", "00:00:10", "-i", input_video, 
    "-t", "2", "-c", "copy", snippet_video
], shell=True)

if not os.path.exists(snippet_video):
    print("[ERROR] Failed to extract snippet.")
    exit(1)

# Step 2: Use FFmpeg's built-in Motion Compensated Interpolation (minterpolate)
# This simulates the RIFE/FILM concept by estimating pixel motion (optical flow)
# and generating missing frames to stretch a 2-second video into 4 seconds (0.5x speed) smoothly.
print("\n[STEP 2] Applying AI Motion Interpolation (Generating missing frames)...")
print("[INFO] This might take a minute as it calculates optical flow for each pixel...")

# setpts=2.0*PTS slows the video down by 2x.
# minterpolate fills the missing gaps with newly generated frames to keep it at 30fps.
subprocess.run([
    "ffmpeg", "-y", "-i", snippet_video,
    "-filter:v", "setpts=2.0*PTS,minterpolate='fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1'",
    "-c:v", "libx264", "-preset", "fast", output_video
], shell=True)

print(f"\n[DONE] Check the folder for '{output_video}'")
print(f"Original 2s video: {snippet_video}")
print(f"Interpolated 4s video (Smooth Slow-mo): {output_video}")
