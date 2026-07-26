# ☀️ আগামীকাল কাজ শুরুর দ্রুত নির্দেশিকা (Quick Start Guide)

> পিসি বন্ধ করার পর আগামীকাল এসে কীভাবে সহজে কাজ শুরু করবেন তা নিচে সংক্ষেপে দেওয়া হলো।

---

## 🎯 আপনার হাতে ২টি বিকল্প আছে:

---

### 🔹 বিকল্প ১: Kaggle দিয়ে জেনারেট করা (সবচেয়ে সহজ — কোনো টানেল বা কানেকশন কাটার ভয় নেই)

1. ব্রাউজারে [Kaggle Notebooks](https://www.kaggle.com/code) খুলুন।
2. আপনার নোটবুকটি খুলুন (বা `kaggle/OmniVoice_Kaggle_Batch.ipynb` ফাইলটি Import/Upload করুন)।
3. **Session Options** থেকে **GPU T4 x2** এবং **Internet: ON** দিন।
4. সবগুলো সেল পর পর **Run All** দিন।
5. শেষ সেলে `omnivoice_outputs_v1_to_v5.zip` ফাইল ১ ক্লিকে ডাউনলোড করে নিন!

---

### 🔹 বিকল্প ২: Google Colab + Antigravity CLI দিয়ে কাজ করা

1. [Google Colab](https://colab.research.google.com) খুলুন।
2. `google colab/OmniVoice_Studio.ipynb` আপলোড করে **T4 GPU** সেট করুন।
3. **Step 1, Step 2, Step 3** পর পর রান দিন।
4. Step 3 আউটপুট থেকে পোর্টের নম্বরটি নোট করুন (যেমন: `bore.pub:11957` হলে পোর্ট = `11957`)।
5. আপনার টার্মিনালে কমান্ডটি দিয়ে অডিও জেনারেট করুন:
   ```bash
   python "google colab/generate_v5_ultra_human_voice_all.py" <PORT>
   ```

---

## 📊 এ পর্যন্ত কাজের অগ্রগতি (Current Status)

| ভার্সন | বিষয়বস্তু | স্ট্যাটাস |
|--------|-----------|-----------|
| **V1** | বেসিক ভয়েস টেস্ট (`alloy`, `echo`) | ✅ সম্পন্ন |
| **V2** | G.I. Joe (McCullen Nanomites ডায়ালগ) | ✅ সম্পন্ন |
| **V3** | আইকনিক মুভি (Sholay, Ammajan, Gladiator) | ✅ সম্পন্ন |
| **V4** | Deep Male Voice (১৪টি টেস্ট স্যাম্পল) | ✅ সম্পন্ন |
| **V5** | Ultra Human Shimmer (Rage, Sadness, Laughter, Whisper, Sick) | ⏳ জেনারেশন রেডি |

---

📁 বিস্তারিত সহায়তার জন্য নির্দেশিকা ফাইলগুলো দেখুন:
- Colab গাইড: `google colab/CONNECTION_GUIDE.md`
- Kaggle গাইড: `kaggle/KAGGLE_GUIDE.md`
