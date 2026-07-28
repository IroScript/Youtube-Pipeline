# 🏔️ Kaggle Batch Audio Generator Guide (v1 to v5)

এই গাইড ব্যবহার করে আপনি **Kaggle-এর ফ্রি GPU (T4)** ব্যবহার করে ১ ক্লিকে V1 থেকে V5 পর্যন্ত সমস্ত অডিও জেনারেট করে Zip ফাইল হিসেবে ডাউনলোড করতে পারবেন।

---

## ⚡ ৪টি সহজ ধাপে সম্পূর্ণ গাইড

### 📍 ধাপ ১: Kaggle-এ নতুন Notebook তৈরি করুন
1. 👉 [Kaggle Notebooks](https://www.kaggle.com/code)-এ যান।
2. **New Notebook** বাটনে ক্লিক করুন।
3. ডানপাশের সাইডবারের **Session Options** থেকে:
   - **Accelerator:** `GPU T4 x2` সিলেক্ট করুন।
   - **Internet:** `ON` (টগল চালু রাখুন)।

---

### 📍 ধাপ ২: Notebook আপলোড বা কোড পেস্ট করুন

#### অপশন A (সহজতম — ফাইল আপলোড):
1. Notebook এর মেনু থেকে **File -> Import Notebook** এ যান।
2. আপনার পিসি থেকে এই নতুন ফাইলটি সিলেক্ট করে আপলোড করুন:
   `kaggle/OmniVoice_Kaggle_Batch.ipynb`

#### অপশন B (কপি-পেস্ট):
নোটবুকের সেলগুলোতে নিচের কোডগুলো একের পর এক পেস্ট করে রান করুন:

* **Cell 1:** (GPU Check)
  ```python
  !nvidia-smi
  ```

* **Cell 2:** (Install OmniVoice)
  ```python
  !pip install -q uv
  !git clone https://github.com/debpalash/OmniVoice-Studio.git /kaggle/working/omnivoice-studio
  %cd /kaggle/working/omnivoice-studio
  !uv sync
  ```

* **Cell 3:** (Start Backend with Popen)
  ```python
  import os, time, subprocess
  %cd /kaggle/working/omnivoice-studio

  log_file = open("/tmp/omnivoice.log", "w")
  subprocess.Popen(["uv", "run", "python", "backend/main.py"], stdout=log_file, stderr=log_file)

  print("⏳ Waiting 15s for server startup...")
  time.sleep(15)
  !curl -sf http://localhost:3900/health || echo '❌ Server starting failed! Check /tmp/omnivoice.log'
  ```

---

### 📍 ধাপ ৩: Batch Generation রান করুন
`OmniVoice_Kaggle_Batch.ipynb` এর **Step 4** (যা এখন সরাসরি পাইথন কোড দিয়ে চলে) এবং **Step 5** সেল দুটি রান দিন।

এটি টি৪ জিপিইউ ব্যবহার করে ভি১ থেকে ভি৫ (Sholay, Ammajan, Gladiator, Deep Male, এবং Shimmer-এর Rage, Sadness, Laughter, Whisper, Sick ইত্যাদি সব আবেগ) একবারে তৈরি করবে।

---

### 📍 ধাপ ৪: ফাইল ডাউনলোড করুন
* **Step 5** সম্পূর্ণ হলে ক্যাগলের ডানপাশের সায়ডবারের **Data -> Output** সেকশনে যান।
* সেখানে `omnivoice_outputs_v1_to_v5.zip` ফাইলটি দেখতে পাবেন।
* ফাইলের পাশে **Download (Three dots -> Download)** এ ক্লিক করে ১ ক্লিকে সব অডিও পিসিতে নামিয়ে নিন!
