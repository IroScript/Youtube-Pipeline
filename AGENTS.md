# YouTube Pipeline — Local Agent Directives (AGENTS.md)

## ChatGPT & CloakBrowser Automation Mandate

1. **NO LOGIN REQUIRED FOR CHATGPT VIA CLOAKBROWSER:**
   - CloakBrowser stealth browser-এ ChatGPT (https://chatgpt.com) ব্যবহার করতে কোনো অ্যাকাউন্ট লগইন প্রয়োজন নেই (cloack browser e login laage na for chatgpt)।
   - ChatGPT গেস্ট মোড / 'Stay logged out' মোডেই সরাসরি প্রম্পট এক্সিকিউশন ও রেসপন্স স্ট্রিম রিড করতে পারে।
   - লগইন সংক্রান্ত কোনো এরর বা ফলব্যাককে 'লগইন নেই' হিসেবে ভুল ব্যাখ্যা করা যাবে না। DOM পপআপ ডিসমিস ('Stay logged out'), টেক্সট এরিয়া লোকেটর বা রেসপন্স স্ট্রিম হ্যান্ডলিং যাচাই করতে হবে।

## Google Veo 3.1 Account vs Target Upload Channel Mandate

1. **VEO 3.1 DEDICATED PROFILE (ULTRA TIER ONLY):**
   - Google অ্যাকাউন্ট `mainuddinh297@gmail.com` (ক্রোম `Profile 5`) শুধুমাত্র এবং শুধুমাত্র **Google Flow / Veo 3.1 (Ultra Tier)** ভিডিও জেনারেশনের জন্য নির্ধারিত।
   - এই অ্যাকাউন্টের সাথে যুক্ত কোনো ইউটিউব চ্যানেল (যেমন `Gaming Dot Bangla` / `@gamingdotbangla249`)-এ পাইপলাইনের কোনো ভিডিও আপলোড করা সম্পূর্ণ নিষিদ্ধ।
   - পাইপলাইনের সমস্ত ভিডিওর একমাত্র বৈধ টার্গেট চ্যানেল হলো **`@AstroSparksAI`** (Astro Sparks AI)। `Gaming Dot Bangla` বা অন্য কোনো জেনারেশন প্রোফাইল চ্যানেলে আপলোড করার কোনো প্রস্তাব বা প্রচেষ্টা চালানো যাবে না।

2. **GOOGLE VEO 3.1 ZERO-CREDIT LOWER PRIORITY MANDATE:**
   - Google Flow / Veo 3.1 এ Lower Priority মোডে ভিডিও তৈরিতে কোনো এআই ক্রেডিট খরচ হয় না (Zero Credits in Lower Priority / Relaxed Queue)।
   - ইন্টারফেসে "You're running low on Google Flow credits" জাতীয় সতর্কবার্তা আসলেও লোয়ার প্রায়োরিটিতে আনলিমিটেড ভিডিও তৈরি সম্পূর্ণ অব্যাহত থাকে। এটিকে কখনোই ক্রেডিট শেষ হওয়া বা কাজ বন্ধের কারণ হিসেবে গণ্য করা সম্পূর্ণ নিষিদ্ধ।

3. **BOT DETECTION VS SUBMIT BUTTON BEHAVIOR IN VEO INTERFACE:**
   - Google Flow / Veo ইন্টারফেসে সাবমিট বাটন (`button[aria-label='Start generation']`) কাজ না করা, ক্লিক না হওয়া বা বাটনের জায়গায় সতর্কতা আইকন (`[!]`) আসা সম্পূর্ণ **বট ডিটেকশন (Bot Detection) সংক্রান্ত এরর**।
   - অটোমেশন দ্রুত বা অসাবধানভাবে রিকোয়েস্ট পাঠালে গুগল ফ্লো সাময়িকভাবে সাবমিট বাটন অবরুদ্ধ (disable/block) করে রাখে। একে কখনোই "ক্রেডিট শেষ" বলে ভুল ব্যাখ্যা করা যাবে না।
   - এর প্রকৃত সমাধান হলো ডায়নামিক অ্যান্টি-বট ইন্টারভ্যাল ও পর্যাপ্ত কুলডাউন রক্ষা করা এবং হিউম্যান-লাইক ব্রাউজার ইন্টারঅ্যাকশন নিশ্চিত করা।

## Absolute Prohibition on Autonomous Deletion & Modification (YouTube Videos & Database)

1. **NO AUTONOMOUS DELETION OR MODIFICATION OF YOUTUBE UPLOADED VIDEOS:**
   - AGY CLI / AI agents must NEVER take any autonomous decision to delete, unlist, private, or remove any YouTube uploaded video (via YouTube API, Studio, scripts, or CLI).
   - AGY CLI must NEVER autonomously modify the title, description, tags, privacy status, thumbnail, or metadata of an already uploaded YouTube video.
   - Any decision, command, or action to delete, modify, or replace an uploaded YouTube video MUST ALWAYS come directly and explicitly from Iraq bhai ("user end theke aste hobe must").

2. **NO AUTONOMOUS DELETION, REPLACEMENT OR WIPING OF DATABASE DATA:**
   - Any information, records, rows, or tables inside the SQLite database (`youtube_pipeline.db`), associated tables (`prompts`, `ideas`, `youtube_metadata`, `publishing`, `pipeline_row_state`, etc.), or related state/registry files (`upload_registry.txt`, `output_packaged/` files) must NEVER be deleted, replaced, wiped, or modified autonomously by AGY CLI.
   - All manual deletion, record replacement, schema alteration, or data purging decisions MUST strictly originate from Iraq bhai. AGY CLI will never independently decide to delete or overwrite database data.
