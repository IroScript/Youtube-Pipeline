"""Explore OmniVoice API for expressive/voice design features"""
import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("bore.pub", port=65426, username="root", password="omnivoice123", timeout=15)
ENV = "export LD_LIBRARY_PATH=/usr/lib64-nvidia:/usr/local/cuda-12.8/lib64:/usr/local/cuda-12.8/compat:$LD_LIBRARY_PATH && "

def run(cmd, t=30):
    _, o, _ = client.exec_command(ENV + cmd, timeout=t)
    return o.read().decode().strip()

# 1. All API routes
print("=== ALL API ROUTES ===")
routes = run("""curl -sf http://localhost:3900/openapi.json | python3 -c '
import sys,json
d = json.load(sys.stdin)
for p, v in sorted(d.get("paths",{}).items()):
    for m in v:
        if m in ("get","post","put","delete","patch"):
            print(f"  {m.upper():6s} {p}")
'""")
print(routes)

# 2. Voice profiles with instruct field
print("\n=== VOICE PROFILES (full) ===")
profiles = run("curl -sf http://localhost:3900/v1/audio/voices")
data = json.loads(profiles)
for v in data.get("voices", []):
    print(f"  {v.get('voice_id'):12s} | {v.get('name'):20s} | type={v.get('type')} | instruct={v.get('instruct','N/A')[:50]}")

# 3. Speech endpoint schema
print("\n=== SPEECH ENDPOINT SCHEMA ===")
schema = run("""curl -sf http://localhost:3900/openapi.json | python3 -c '
import sys,json
d = json.load(sys.stdin)
speech = d.get("paths",{}).get("/v1/audio/speech",{}).get("post",{})
body = speech.get("requestBody",{}).get("content",{})
for ct, v in body.items():
    ref = v.get("schema",{}).get("\\$ref","") or str(v.get("schema",{}))
    print(f"  {ct}: {ref}")
# Find the schema
for name, sch in d.get("components",{}).get("schemas",{}).items():
    if "speech" in name.lower() or "tts" in name.lower():
        print(f"\\n  Schema: {name}")
        for prop, pval in sch.get("properties",{}).items():
            print(f"    {prop}: {pval}")
'""")
print(schema)

# 4. Check instruct parameter in speech
print("\n=== TEST: SPEECH WITH INSTRUCT ===")
test = run("""curl -sf http://localhost:3900/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model":"tts-1","voice":"shimmer","input":"Hello world","instruct":"Speak with deep male voice, slow pace, add breathing","response_format":"wav"}' \
  -o /dev/null -w 'HTTP:%{http_code} SIZE:%{size_download}'""")
print(f"  instruct field test: {test}")

# 5. Check voice design/create endpoint
print("\n=== VOICE CREATE/DESIGN ===")
for ep in ["/v1/audio/voice-profiles", "/v1/voices", "/v1/audio/voice-design"]:
    r = run(f"curl -sf http://localhost:3900{ep} -w 'HTTP:%{{http_code}}' 2>/dev/null || echo 'N/A'")
    print(f"  GET {ep}: {r[:200]}")

client.close()
print("\nDONE!")
