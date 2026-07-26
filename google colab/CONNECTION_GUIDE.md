# 🔗 Google Colab + Antigravity CLI কানেকশন গাইড

## ⚡ দ্রুত সংযোগ (৩ ধাপ)

### ধাপ ১: Colab-এ Notebook আপলোড ও রান করুন

1. 👉 https://colab.research.google.com যান
2. **File → Upload notebook** → আপলোড করুন:
   `OmniVoice_Studio.ipynb` (এই ফোল্ডারেই আছে)
3. **Runtime → Change runtime type → T4 GPU** সিলেক্ট করুন
4. **Step 1 → Step 2 → Step 3** সেলগুলো একে একে রান করুন

### ধাপ ২: Port নম্বর নোট করুন

Step 3 রান করলে আউটপুটে দেখাবে:
```
listening at bore.pub:XXXXX
```
এই **XXXXX** হলো port নম্বর।

### ধাপ ৩: Antigravity CLI-তে port দিন

এই CLI-তে এসে port নম্বরটি দিলেই SSH দিয়ে কানেক্ট হয়ে কাজ শুরু হবে।

---

## 📋 সংযোগ তথ্য (প্রতিবার একই)

| তথ্য     | মান                                     |
|----------|-----------------------------------------|
| Host     | `bore.pub`                              |
| Port     | **প্রতিবার পরিবর্তন হবে** (Step 3 থেকে)  |
| User     | `root`                                  |
| Password | `omnivoice123`                          |

---

## ⚠️ গুরুত্বপূর্ণ নোট

1. **Colab ট্যাব বন্ধ করবেন না** — বন্ধ করলে টানেল কাটা যাবে
2. **Colab সেশন সীমিত** — ফ্রি অ্যাকাউন্টে ~4 ঘণ্টা
3. **প্রতিবার নতুন port** — bore.pub প্রতিবার ভিন্ন port দেয়
4. **Colab রিসেট হলে** Step 1-3 আবার রান করতে হবে
5. **সব ফাইল এই `google colab` ফোল্ডারে** — বাইরে কিছু জেনারেট হবে না

---

## 🔧 সমস্যা সমাধান

| সমস্যা                | সমাধান                                           |
|------------------------|--------------------------------------------------|
| bore কানেক্ট হচ্ছে না | Step 3 বন্ধ করে আবার রান করুন                    |
| SSH timeout            | Colab ট্যাব চেক করুন — সেশন মারা গেছে কিনা      |
| GPU দেখাচ্ছে না       | Runtime → Change runtime type → T4 GPU           |
| Colab disconnected     | নতুন সেশন শুরু করে Step 1-3 আবার রান করুন        |

---

## 📁 এই ফোল্ডারের ফাইল তালিকা

```
google colab/
├── CONNECTION_GUIDE.md        ← এই গাইড
├── OmniVoice_Studio.ipynb     ← Colab-এ আপলোড করার notebook
├── colab_ssh.py               ← SSH helper (CLI ব্যবহার করে)
├── setup_omnivoice.py         ← OmniVoice Colab-এ ইনস্টল করার script
├── omnivoice_generate.py      ← OmniVoice দিয়ে অডিও জেনারেট করার script
└── output/                    ← জেনারেট করা ফাইল এখানে আসবে
```
