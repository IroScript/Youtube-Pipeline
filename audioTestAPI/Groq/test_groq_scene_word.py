import sys
import os
from groq import Groq

# API Key read
api_key_path = r"C:\Users\Irak\Desktop\Youtube Pipeline\audioTestAPI\Groq\GroqAPIKey.txt"
with open(api_key_path, "r", encoding="utf-8") as f:
    groq_api_key = f.read().strip()

client = Groq(api_key=groq_api_key)

# The user should paste the word-level transcript here, or we can read from the generated file.
transcript_file = r"C:\Users\Irak\Desktop\Youtube Pipeline\kaggle audio\word_transcription_test.txt"
if os.path.exists(transcript_file):
    with open(transcript_file, "r", encoding="utf-8") as f:
        transcript = f.read()
else:
    # Example fallback if file doesn't exist
    transcript = """[0.000s -> 0.320s]  The
[0.321s -> 0.710s]  Earth
[0.711s -> 1.280s]  shattered
[1.281s -> 2.050s]  instantly"""

system_prompt = """
You are an expert AI Video Director mapping an audio transcript to Veo 3.1 video scenes.
You are given a WORD-BY-WORD timestamped transcript. 
Your job is to group these words into logical Scenes (typically 4, 6, 8, or 10 seconds based on Veo's generation slots).

RULES FOR VEO 3.1:
1. Carefully analyze the start time of the first word and the end time of the last word in a scene.
2. Ensure the Veo Target Duration (4s, 6s, 8s, 10s) is AT LEAST 0.5s longer than the actual Audio Duration to prevent audio cut-offs.
3. Write a highly detailed, cinematic visual prompt.
4. INCORPORATE A TIMELINE within the prompt to guide Veo on when exact events should occur based on the millisecond word timestamps.
   Example:
   0.0-0.7s: Show Earth from space.
   0.7-1.3s: Massive cracks appear as the word "shattered" is spoken.
   1.3-2.0s: Planet explodes into glowing fragments.
5. Provide a "Total Scene Guide" at the very end of your response, summarizing the visual progression, the pacing, and how it synchronizes with the audio.

Output Format:
**Scene 1:**
- **Words:** [0.000s -> 2.050s] The Earth shattered instantly
- **Veo Target Duration:** 4s
- **Cinematic Prompt:** 
  0.0-0.7s: A majestic view of Earth from space...
  0.7-1.3s: Sudden massive glowing cracks appear...
  1.3-2.0s: The planet shatters instantly...
  2.0-4.0s: Lingering shot of the debris floating in space.

[... More Scenes ...]

**Total Scene Guide:**
- Scene 1 (0.0-4.0s): Introduction of Earth shattering, aligns perfectly with the opening phrase. Make sure to emphasize the visual impact precisely at 0.7s.
- ...
"""

print("Sending request to Groq API using model openai/gpt-oss-120b ...")
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Transcript:\n{transcript}"}
        ],
        temperature=0.7,
        max_completion_tokens=4096,
        top_p=1,
        stream=True,
        stop=None
    )
    
    output_text = ""
    for chunk in completion:
        content = chunk.choices[0].delta.content or ""
        print(content, end="")
        output_text += content
        
    output_file = r"C:\Users\Irak\Desktop\Youtube Pipeline\scene_prompts_timeline_groq.md"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(output_text)
        
    print(f"\n\nSuccess! Output written to {output_file}")
    
except Exception as e:
    print(f"\nError occurred: {e}")
