import groq

client = groq.Groq(api_key="YOUR_GROQ_API_KEY")

transcript = """[0.00s -> 5.44s]  What if the greatest invention in human history wasn't a machine that traveled through space,
[5.72s -> 7.44s]  but one that crossed possibilities?"""

system_prompt = "You are a director. Give a 1 sentence video prompt for this."

print("Sending request to Groq API using model openai/gpt-oss-120b ...")
try:
    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Transcript:\n{transcript}"}
        ],
        temperature=1,
        max_completion_tokens=2048,
        top_p=1,
        stream=False,
        stop=None
    )
    print("RESPONSE CONTENT:")
    print(repr(completion.choices[0].message.content))
except Exception as e:
    print(f"Error occurred: {e}")

