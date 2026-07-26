# 🔗 Google Colab + SSH কানেকশন গাইড

> টার্মিনাল/সেশন বন্ধ হলে এই গাইড ফলো করে যেকোনো AI coding tool আবার কানেক্ট করতে পারবে।

---

## 📋 প্রয়োজনীয়তা (লোকাল PC-তে)

```
pip install paramiko
```

---

## ⚡ সম্পূর্ণ ওয়ার্কফ্লো (৫ ধাপ)

### ধাপ ১: Colab-এ Notebook রান করুন

1. https://colab.research.google.com যান
2. **File → Upload notebook** → আপলোড করুন:
   `google colab/OmniVoice_Studio.ipynb`
3. **Runtime → Change runtime type → T4 GPU** সিলেক্ট করুন
4. **Step 1 → Step 2 → Step 3** সেলগুলো একে একে রান করুন
5. Step 3 আউটপুটে দেখাবে:
   ```
   listening at bore.pub:XXXXX
   ```
   এই **XXXXX** = port নম্বর

### ধাপ ২: SSH কানেকশন টেস্ট করুন

```bash
python "google colab/colab_ssh.py" <PORT>
```

উদাহরণ:
```bash
python "google colab/colab_ssh.py" 37404
```

সফল হলে GPU info দেখাবে।

### ধাপ ৩: OmniVoice সার্ভার ইনস্টল ও চালু করুন (প্রথমবার)

`setup_omnivoice.py` ফাইলে PORT আপডেট করুন (LINE 7: `PORT = <আপনার port>`), তারপর:

```bash
python "google colab/setup_omnivoice.py"
```

> ⚠️ প্রথমবার ৫-৮ মিনিট লাগবে (dependencies install)।
> Colab সেশন রিসেট হলে প্রতিবার এটা আবার রান করতে হবে।

### ধাপ ৪: OmniVoice সার্ভার চালু করুন

Colab-এ নতুন সেলে রান করুন:
```python
!export PATH=$HOME/.local/bin:$PATH && cd /content/omnivoice-studio && nohup uv run python backend/main.py > /tmp/omnivoice.log 2>&1 &
!sleep 10 && curl -sf http://localhost:3900/health
```

আউটপুট `{"status":"ok","device":"cuda (Tesla T4)","version":"0.4.0"}` দেখালে সার্ভার চালু।

### ধাপ ৫: অডিও জেনারেট করুন

```bash
# Edge-TTS + Bark AI + OmniVoice — সবগুলো একসাথে
python "google colab/generate_v1_all.py" <PORT>

# অথবা v2 (McCullen dialogue)
python "google colab/generate_v2_all.py" <PORT>
```

---

## 🔧 SSH দিয়ে যেকোনো কমান্ড রান করুন

```python
# Python দিয়ে:
import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("bore.pub", port=PORT, username="root", password="omnivoice123", timeout=15)

ENV = "export LD_LIBRARY_PATH=/usr/lib64-nvidia:/usr/local/cuda-12.8/lib64:/usr/local/cuda-12.8/compat:$LD_LIBRARY_PATH && "
_, o, e = client.exec_command(ENV + "nvidia-smi")
print(o.read().decode())
client.close()
```

---

## 📋 সংযোগ তথ্য

| তথ্য     | মান                                     |
|----------|-----------------------------------------|
| Host     | `bore.pub`                              |
| Port     | **প্রতিবার পরিবর্তন হয়** (Step 3 থেকে)  |
| User     | `root`                                  |
| Password | `omnivoice123`                          |
| SSH Port (Colab internal) | `2222`                  |
| OmniVoice API | `http://localhost:3900/v1` (Colab-এর ভেতরে) |

---

## 📁 ফোল্ডার গঠন

```
google colab/
├── CONNECTION_GUIDE.md           ← এই গাইড
├── OmniVoice_Studio.ipynb        ← Colab-এ আপলোড করার notebook
├── colab_ssh.py                  ← SSH helper (PORT argument নেয়)
├── setup_omnivoice.py            ← OmniVoice Colab-এ install করার script
├── generate_v1_all.py            ← V1 সব AI generate
├── generate_v2_all.py            ← V2 সব AI generate
│
├── edge_tts/                     ← Microsoft Cloud TTS (GPU নয়)
│   ├── v1_edge_tts.py
│   ├── v2_edge_tts.py
│   └── v*_*.mp3                  ← generated audio
│
├── bark_ai/                      ← HuggingFace Bark (GPU)
│   ├── v1_bark_ai.py
│   ├── v2_bark_ai.py
│   └── v*_*.wav                  ← generated audio
│
└── omnivoice/                    ← OmniVoice Studio (GPU, সবচেয়ে দ্রুত)
    ├── v1_omnivoice.py
    ├── v2_omnivoice.py
    └── v*_*.wav                  ← generated audio
```

---

## 🔑 গুরুত্বপূর্ণ এনভায়রনমেন্ট ভেরিয়েবল (Colab SSH-এ)

```bash
# GPU access-এর জন্য প্রতিটি কমান্ডের আগে এটা দিতে হবে:
export LD_LIBRARY_PATH=/usr/lib64-nvidia:/usr/local/cuda-12.8/lib64:/usr/local/cuda-12.8/compat:$LD_LIBRARY_PATH

# uv (Python package manager) access:
export PATH=$HOME/.local/bin:$PATH
```

---

## ⚠️ গুরুত্বপূর্ণ নোট

1. **Colab ট্যাব বন্ধ করবেন না** — টানেল কাটা যাবে
2. **ফ্রি Colab সেশন ~4 ঘণ্টা** — এরপর সব মুছে যাবে
3. **প্রতিবার নতুন port** — bore.pub র‍্যান্ডম port দেয়
4. **Colab রিসেট হলে** → Step 1-4 আবার করতে হবে
5. **NVIDIA API keys** → `audioTestAPI/NVIDIA/NVIDIA NIM API KEY.txt` (gitignored)
6. **সব ফাইল এই `google colab/` ফোল্ডারে থাকবে** — বাইরে কিছু না

---

## 🔧 সমস্যা সমাধান

| সমস্যা | সমাধান |
|--------|--------|
| `bore` কানেক্ট হচ্ছে না | Step 3 বন্ধ করে আবার রান করুন |
| SSH `Connection closed` | SSH port 2222, bore tunnel port 2222 দিয়ে করতে হবে |
| `nvidia-smi` কাজ করে না | `LD_LIBRARY_PATH` সেট করুন (উপরে দেওয়া আছে) |
| OmniVoice `NOT READY` | সার্ভার চালু হতে ১০-১৫s সময় লাগে, আবার চেষ্টা করুন |
| `paramiko timeout` | Colab সেশন মারা গেছে — নতুন সেশন শুরু করুন |
| OmniVoice প্রথম TTS ধীর | প্রথমবার মডেল ডাউনলোড হয়, পরেরবার দ্রুত |
