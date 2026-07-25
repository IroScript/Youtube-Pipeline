"""Minimal Vertex AI example: generate text with Gemini 3.5 Flash."""
from google import genai
from google.genai import types

# 1) Init client (uses GOOGLE_CLOUD_PROJECT env or hardcoded fallback)
client = genai.Client(vertexai=True, project="irak-mahmud-project", location="us-central1")

# 2) Call Gemini Flash for text generation
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Write a 15-sentence cinematic prompt for a sunset over Dhaka.",
    config=types.GenerateContentConfig(temperature=0.7, max_output_tokens=1280),
)

# 3) Print result
print(response.text)