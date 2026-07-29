import subprocess
import sys

# Ensure openai is installed
try:
    import openai
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openai"])
    import openai

from openai import OpenAI

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key="YOUR_NVIDIA_API_KEY",
    timeout=60.0
)

transcript = """[0.00s -> 5.44s]  What if the greatest invention in human history wasn't a machine that traveled through space,
[5.72s -> 7.44s]  but one that crossed possibilities?
[8.22s -> 9.16s]  Another universe?
[9.98s -> 10.50s]  Seriously?
[11.34s -> 12.62s]  Scientists kept working.
[13.58s -> 14.92s]  Everyone else kept doubting.
[15.20s -> 18.06s]  And suddenly, the impossible became real.
[18.98s -> 22.38s]  We saw dinosaurs still walking beneath blood-red skies.
[22.84s -> 25.58s]  We found another Earth where humanity was born on Mars.
[26.42s -> 26.92s]  But me?
[27.46s -> 29.60s]  No, none of those worlds mattered.
[30.34s -> 31.06s]  Not one.
[31.76s -> 33.74s]  I was searching for someone.
[34.72s -> 36.52s]  Cancer stole my mother.
[36.80s -> 37.32s]  No warning.
[37.74s -> 38.30s]  No mercy.
[38.70s -> 39.70s]  No second chance.
[40.22s -> 43.52s]  I watched the hospital monitor become silent.
[43.64s -> 46.50s]  I held her hand, hoping, just hoping.
[47.36s -> 50.82s]  She would squeeze mine one last time.
[51.36s -> 52.04s]  She never did.
[52.56s -> 53.76s]  I know she will never answer.
[54.46s -> 56.24s]  I know that, but I still call.
[56.72s -> 59.72s]  Because sometimes, hope hurts more than reality.
[59.72s -> 60.20s]  Listen.
[60.94s -> 62.06s]  Take me to the universe.
[62.90s -> 64.90s]  Where my mother, there she was.
[65.58s -> 66.14s]  Alive.
[66.74s -> 67.20s]  Smiling.
[67.82s -> 68.62s]  Making breakfast.
[69.32s -> 73.66s]  Humming the exact same song she used to sing every Sunday morning.
[74.16s -> 76.12s]  She did not know I was not her son.
[76.58s -> 77.68s]  I was a broken man.
[78.64s -> 80.32s]  Borrowing someone else's miracle."""

system_prompt = """
You are an expert AI Video Director mapping an audio transcript to Veo video scenes. 
Your job is to group consecutive lines into logical Scenes.

RULES FOR VEO:
1. The user only has access to 4s and 6s video generations. DO NOT assign 8s.
2. For each scene, sum up the total audio duration (End Timestamp of last line - Start Timestamp of first line).
3. Assign a Veo Duration of either 4s or 6s. The Veo Duration must be AT LEAST 0.5s longer than the Audio Duration.
4. If a scene's audio duration is too long to fit in 6s (e.g. requires 8s or 10s), you MUST try to break it down into smaller 4s/6s scenes. 
5. If it is absolutely impossible to break it down and a 10s chunk is required, write "10s (Commented out: User does not have 8s/10s access right now)" in the Veo Target Duration field.
6. Write a highly detailed, cinematic visual prompt (no audio/narration mentioned).

Output Format:
**Scene 1:**
- **Lines:** [0.00s -> 3.00s] What if...
- **Audio Duration:** 3.00s
- **Veo Target Duration:** 4s
- **Cinematic Prompt:** A hyper-realistic tracking shot through a glowing futuristic laboratory...
"""

print("Sending request to NVIDIA NIM API (meta/llama-3.1-70b-instruct)...")
try:
    completion = client.chat.completions.create(
        model="meta/llama-3.1-70b-instruct",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Transcript:\n{transcript}"}
        ],
        temperature=0.3,
        max_tokens=2048
    )
    output_file = r"C:\Users\Irak\Desktop\Youtube Pipeline\audioTestAPI\NVIDIA\scene_detection_prompts.md"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(completion.choices[0].message.content)
    
    print(f"Success! Saved to: {output_file}")
    print("Here is a preview:")
    print(completion.choices[0].message.content[:800] + "...\n(truncated)")
except Exception as e:
    print(f"Error: {e}")

