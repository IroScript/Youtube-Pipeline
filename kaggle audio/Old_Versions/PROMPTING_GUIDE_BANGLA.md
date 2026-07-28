# 🎭 OmniVoice সঠিক প্রম্পটিং গাইড — docs/expressive-speech.md অনুযায়ী
# ════════════════════════════════════════════════════════════════════════

## ⚠️ আগের গাইডে যা ভুল ছিল

| ❌ ভুল ধারণা | ✅ আসল সত্য |
|---|---|
| CAPS লিখলে চেঁচাবে | Documented নয় — কোনো গ্যারান্টি নেই |
| `[cry]`, `[whisper]`, `[trembling]` কাজ করে | Unsupported token — engine literal text হিসেবে পড়ে, noise আসে |
| পুরো স্ক্রিপ্ট একবারে দিলে ভালো | Non-autoregressive architecture-তে emotion carryover হয় |
| শুধু text style দিয়ে emotion আসে | Reference clip হলো #1 expressive control |

---

## 📋 DOCUMENTED TAGS — শুধু এগুলো কাজ করে

```
[laughter]         → হাসির শব্দ
[sigh]             → দীর্ঘশ্বাস
[breath]           → শ্বাস নেওয়ার শব্দ
[pause]            → 350ms default silence
[pause 500ms]      → নির্দিষ্ট সময়ের silence
[pause 1.5s]       → ১০ সেকেন্ড পর্যন্ত
```

### ❌ এগুলো ব্যবহার করবেন না:
```
[cry]    [whisper]    [trembling]    [excited]
[angry]  [sad]        [happy]        [scared]
```
> ডকুমেন্টেশন: *"Unrecognized tags are not stripped. An engine that doesn't
> know a tag receives it as literal text and will try to speak it."*

---

## 🧠 মূল নীতি #1: প্রতিটা Beat = আলাদা API Call

**কেন?** OmniVoice-এর non-autoregressive architecture পুরো text একসাথে
denoise করে। তাই excitement segment-এর energy, sadness segment-এ carry
হয়ে যায়।

**সমাধান:** প্রতিটা emotional beat আলাদা API call → আলাদা WAV → শেষে concat

```python
# ✅ সঠিক
segments = [
    {"text": "Happy text...", "speed": 1.05},      # Call 1
    {"silence_ms": 500},                            # Pause
    {"text": "Sad text...", "speed": 0.80},          # Call 2
]
# প্রতিটা segment আলাদা API call → আলাদা WAV → concat

# ❌ ভুল
gen("Happy text... Sad text...", speed=0.88)  # একসাথে — emotion carryover হবে
```

---

## 🧠 মূল নীতি #2: Reference Clip = সবচেয়ে শক্তিশালী Control

> ডকুমেন্টেশন: *"The reference clip is a performance direction. Zero-shot
> cloning mirrors the delivery of the reference, not just the timbre —
> a flat reference clones flat, an animated one clones animated."*

**কিভাবে ব্যবহার করবেন:**

1. ৮-১৫ সেকেন্ডের একটা ক্লিপ রেকর্ড করুন
2. সেই ক্লিপে যে emotion চান সেই delivery-তে কথা বলুন
3. API-তে reference clip হিসেবে দিন
4. পুরো output সেই delivery mirror করবে

**Sad segment এর জন্য → কান্না-ভেজা ধীর গলায় ক্লিপ দিন**
**Angry segment এর জন্য → জোরে, তীক্ষ্ণ গলায় ক্লিপ দিন**

---

## 🧠 মূল নীতি #3: Punctuation = Prosody Control

> ডকুমেন্টেশন: *"Ellipses, dashes, exclamation marks, and short fragments
> genuinely shape pacing and intonation. Cheap, underrated."*

| Punctuation | কি করে |
|---|---|
| `...` (ellipsis) | ধীর পজ, hesitation |
| `—` (em dash) | হঠাৎ থামা, dramatic break |
| `!` | emphasis, energy বাড়ায় |
| ছোট fragments | faster pacing, urgency |

```python
# ✅ ভালো — punctuation prosody shape করে
"Three years ago... cancer... stole my mother. No warning. No mercy."

# ❌ খারাপ — flat, report-like
"Three years ago cancer stole my mother with no warning or mercy."
```

---

## ⚙️ Production Overrides — ইমোশন Fine-Tuning

### `class_temperature`
```
0.0  → Greedy, predictable, flat (default)
0.2  → Slight variation
0.3  → Recommended for narration
0.4  → Good "human edges"
0.5  → More random, natural — sad/emotional segments-এ ভালো
0.7  → Maximum variation (risk of artifacts)
```

### `postprocess_output`
```
True  (default) → Silence trim করা হয়
False           → Silence/breath preserved — sad segments-এ natural pauses থাকে
```
> ডকুমেন্টেশন: *"where breath artifacts live"*

### `speed`
```
0.78  → খুব ধীর (whisper/plea/grief)
0.80  → ধীর (sadness, fear)
0.82  → ধীর-মাঝারি (pain, reflection)
0.85  → সিনেমাটিক (personal shift)
0.88  → ভালো default (narration, warmth)
0.95  → মাঝারি (neutral narration)
1.00  → স্বাভাবিক
1.05  → দ্রুত (excitement, laughter)
```

### `guidance_scale`
```
1.5  → শান্ত, soft (whisper/plea segments)
2.0  → স্বাভাবিক (narration, sadness)
2.2  → সামান্য emotional
2.5  → আবেগপূর্ণ (pain, excitement)
3.0  → চরম আবেগ (rage — সাবধানে ব্যবহার করুন)
```

---

## 🎙️ মেল ভয়েস অপশন

| Voice | চরিত্র | কখন ব্যবহার |
|---|---|---|
| `onyx` | গভীর, গম্ভীর | সিনেমাটিক, হিরো, ভিলেন, ন্যারেটর |
| `echo` | মধ্যম | গল্প বলা, বর্ণনা, ক্যাজুয়াল |
| `alloy` | হালকা/নিউট্রাল | তরুণ, everyday |

---

## 🎬 Engine-Specific Features

### যদি IndexTTS2 থাকে (BEST for emotion):
```python
# 8-emotion vector: [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]
payload["emo_vector"] = [0, 0, 0.9, 0.3, 0, 0.7, 0, 0]  # sad+afraid+melancholic
payload["emo_alpha"] = 0.6  # strength (0.6 recommended for natural)
# অথবা text description:
payload["emo_text"] = "grief-stricken, voice breaking"
```

### যদি CosyVoice 3 থাকে:
```python
payload["instruct"] = "sound heartbroken, barely holding back tears"
# Natural language — সবচেয়ে intuitive
```

### যদি VoxCPM2 থাকে:
```python
text = "(speaking fast, out of breath) I can't stop now."
# Parenthetical instruct at text start
```

---

## ✅ চেকলিস্ট — V8 স্ক্রিপ্ট লেখার আগে

- [ ] প্রতিটা emotional beat আলাদা segment-এ?
- [ ] Segments-এর মধ্যে silence pause আছে? (mood shift-এ বেশি ms)
- [ ] শুধু documented tags ব্যবহার করেছি? ([laughter], [sigh], [breath], [pause])
- [ ] Punctuation দিয়ে pacing shape করেছি? (... — ! fragments)
- [ ] Sad segments-এ postprocess_output = False?
- [ ] Emotional segments-এ class_temperature 0.3-0.5?
- [ ] speed আর guidance_scale ইমোশন অনুযায়ী?
- [ ] কোনো unsupported tag নেই? ([cry], [whisper], etc.)
