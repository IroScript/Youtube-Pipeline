import sys
import os
import urllib.request
import urllib.parse
import re
from datetime import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def stage1_verify_prompt(raw_prompt):
    cleaned = raw_prompt.lower().strip()
    words = re.findall(r'\b\w+\b', cleaned)
    stop_words = {'sound', 'audio', 'effect', 'sfx', 'a', 'the', 'of', 'in', 'on', 'with', 'and', 'for', 'to', 'into'}
    keywords = [w for w in words if w not in stop_words]
    if not keywords:
        keywords = ["impact"]
    return keywords, cleaned

def query_freesound_page(search_text):
    encoded_query = urllib.parse.quote(search_text)
    url = f"https://freesound.org/search/?q={encoded_query}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        req = urllib.request.Request(url, headers=headers)
        html = urllib.request.urlopen(req).read().decode('utf-8')
        mp3_urls = re.findall(r'https://cdn\.freesound\.org/previews/\d+/\d+_[^\"]+\.mp3', html)
        unique_urls = list(dict.fromkeys(mp3_urls))
        if not unique_urls:
            mp3_urls = re.findall(r'https://cdn\.freesound\.org/previews/[^\"]+\.mp3', html)
            unique_urls = list(dict.fromkeys(mp3_urls))
        return unique_urls
    except Exception:
        return []

def stage2_verify_search(prompt_keywords, full_prompt):
    candidates = query_freesound_page(full_prompt)
    if not candidates and len(prompt_keywords) > 1:
        primary_query = " ".join(prompt_keywords[:2])
        candidates = query_freesound_page(primary_query)
    if not candidates and prompt_keywords:
        candidates = query_freesound_page(prompt_keywords[0])
    if candidates:
        return candidates[0]
    return None

def stage3_verify_output(filepath):
    if not os.path.exists(filepath):
        return False
    file_size = os.path.getsize(filepath)
    if file_size < 10240:
        return False
    return True

def generate_sfx(raw_prompt="rain sound"):
    print("=" * 65)
    print(f"🔊 SFX Engine — Freesound Real-Time Verified SFX Generator")
    print("=" * 65)
    
    keywords, cleaned_prompt = stage1_verify_prompt(raw_prompt)
    verified_url = stage2_verify_search(keywords, cleaned_prompt)
    
    if not verified_url:
        print("❌ Freesound search failed to find candidate.")
        return None
        
    sanitized = cleaned_prompt.replace(" ", "_")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{sanitized}_sfx_{timestamp}.mp3"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    if os.path.exists(filepath):
        filename = f"{sanitized}_sfx_{timestamp}_v2.mp3"
        filepath = os.path.join(OUTPUT_DIR, filename)
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    try:
        req = urllib.request.Request(verified_url, headers=headers)
        with urllib.request.urlopen(req) as resp, open(filepath, 'wb') as f:
            f.write(resp.read())
    except Exception as e:
        print(f"❌ Download error: {e}")
        return None

    if stage3_verify_output(filepath):
        abs_path = os.path.abspath(filepath)
        size_kb = os.path.getsize(abs_path) / 1024
        print("=" * 65)
        print(f"🎉 New SFX File Created: {abs_path}")
        print(f"📊 Size: {size_kb:.2f} KB")
        print("=" * 65)
        return abs_path
    return None

if __name__ == "__main__":
    prompt_arg = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "rain sound"
    generate_sfx(prompt_arg)
