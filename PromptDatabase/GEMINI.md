# GLOBAL AI ASSISTANT MANDATE & SYSTEM INSTRUCTIONS (`GEMINI.md`)

> 🛑 **CRITICAL SYSTEM MANDATE FOR ALL AI CODING AGENTS & TOOLS** 🛑
> 
> You are operating inside the user's workspace.
> You must strictly observe all global directives and domain-specific rules without exception.

---

## SECTION 1: GLOBAL AGENT DIRECTIVES & SYSTEM RULES

1. **BEFORE EDITING CODE:** You MUST test and verify all code changes yourself before applying them. Code must not be applied until tests pass successfully.
2. **FORCEFUL EXECUTION & WORKFLOW INTEGRITY:** Execute exactly what the user requests, test and verify fulfillment, and ensure total user workflow remains perfectly intact.
3. **RESPONSE LANGUAGE:** Always reply using Bangla script (সর্বদা বাংলা লিপি ব্যবহার করে উত্তর দাও, কোনো বাংলিশ নয়।).
4. **USER SALUTATION:** Always call the user **"ইরাক ভাইয়া"** when responding.
5. **FULL FILE PATH MANDATE (NEVER USE RELATIVE PATHS, SHORT FILENAMES, OR BASENAME LINKS):**
   - ALWAYS mention, write, and reference the complete absolute file path starting from the drive letter (e.g., `C:\Users\Irak\Desktop\AntiBotBrowser\flowboard\agent\flowboard\db\models.py` or `file:///C:/Users/Irak/...`).
   - NEVER output relative paths (like `flowboard/agent/...` or `database/models.py`) under any circumstances.
   - NEVER output standalone filenames or basenames (like `models.py`, `start_automation.bat`, or `run_prompt_fillup.bat`) under any circumstances.
   - NEVER use short filenames / basenames inside Markdown links (e.g., `[start_automation.bat](file:///...)` is STRICTLY PROHIBITED). Both the visible link text AND the target URI must contain the full absolute path (e.g., `[`file:///C:/Users/Irak/Desktop/Youtube%20Pipeline/video/1Video10Sec/start_automation.bat`](file:///C:/Users/Irak/Desktop/Youtube%20Pipeline/video/1Video10Sec/start_automation.bat)` or `C:\Users\Irak\Desktop\Youtube Pipeline\video\1Video10Sec\start_automation.bat`).
6. **GIT PUSH RULES (STRICT USER CONTROL):**
   - NEVER make the decision to push on your own.
   - NEVER question the user's command to push.
   - The decision to push MUST always come from the user. When the user says `'git push'`, execute it immediately.
   - NEVER git push from yourself until explicitly commanded.
   - NEVER delete any old git commit or perform hard resets (`git reset --hard`).
   - ALWAYS verify 200% availability in GitHub cloud using `git ls-remote origin main` and `git log -1`.
7. **KAGGLE SCRIPT FORMATTING:** Always provide a plain text version of any Kaggle script to avoid indentation issues when copy-pasting.
8. **PROTECTED PROCESS (OpenRecall):**
   - NEVER kill, stop, or terminate the `run_openrecall.py` process or any process with "openrecall" in its name.
   - Path: `C:\Users\Irak\Desktop\AI_Agent\DigitalHistory\run_openrecall.py`.
   - Exclude OpenRecall from any process cleanup commands.
9. **COMPLETION NOTIFICATION:** Always inform the user that all tasks are done, cross-checked, and 200% verified.
10. **ABSOLUTE PROHIBITION ON AUTONOMOUS DELETION OR MODIFICATION OF YOUTUBE UPLOADED VIDEOS:**
    - The AI / AGY CLI must NEVER autonomously decide to delete, unlist, private, or remove any YouTube uploaded video (whether via YouTube API, Studio, scripts, or CLI).
    - The AI must NEVER autonomously modify the title, description, tags, privacy status, thumbnail, or metadata of an already uploaded YouTube video.
    - Any decision, command, or action to delete, modify, or replace an uploaded YouTube video MUST ALWAYS come directly and explicitly from Iraq bhai ("user end theke aste hobe must").
11. **ABSOLUTE PROHIBITION ON AUTONOMOUS DELETION, REPLACEMENT OR WIPING OF DATABASE DATA:**
    - Any information, records, rows, or tables inside the SQLite database (`youtube_pipeline.db`), associated tables (`prompts`, `ideas`, `youtube_metadata`, `publishing`, `pipeline_row_state`, etc.), or related state/registry files (`upload_registry.txt`, `output_packaged/` files) must NEVER be deleted, replaced, wiped, or modified autonomously by AGY CLI.
    - All manual deletion, record replacement, schema alteration, or data purging decisions MUST strictly originate from Iraq bhai. AGY CLI will never independently decide to delete or overwrite database data.
12. **GOOGLE VEO 3.1 ZERO-CREDIT LOWER PRIORITY MANDATE:**
    - Google Flow / Veo 3.1 এ Lower Priority মোডে ভিডিও তৈরিতে কোনো এআই ক্রেডিট (credits) খরচ হয় না (Zero AI Credits Required in Lower Priority / Relaxed Queue)।
    - পেজে "You're running low on Google Flow credits" জাতীয় সতর্কবার্তা বা ব্যানার দেখালেও লোয়ার প্রায়োরিটিতে আনলিমিটেড ভিডিও তৈরি সম্পূর্ণ অব্যাহত থাকে। এটিকে কখনোই ক্রেডিট শেষ বা ফুরিয়ে যাওয়ার সমস্যা মনে করা সম্পূর্ণ নিষিদ্ধ।
13. **BOT DETECTION VS SUBMIT BUTTON BEHAVIOR IN VEO INTERFACE:**
    - Google Flow / Veo ইন্টারফেসে সাবমিট বাটন (`button[aria-label='Start generation']`) কাজ না করা, ক্লিক না হওয়া, বাটন গায়েব হওয়া বা বাটনে অরেঞ্জ/সতর্কতা আইকন (`[!]`) প্রতিস্থাপিত হওয়া খাঁটি **বট ডিটেকশন (Bot Detection) সংক্রান্ত এরর**।
    - অটোমেটেড স্ক্রিপ্টের দ্রুত ইন্টারঅ্যাকশন বা প্যাটার্ন শনাক্ত হলে গুগল ইন্টারফেস সাময়িকভাবে সাবমিট বাটন অবরুদ্ধ (disable/block) করে রাখে।
    - একে কখনোই ক্রেডিট শেষ হওয়া বা DOM নিখোঁজ হওয়া বলে ভুল ব্যাখ্যা করা যাবে না। এটি সম্পূর্ণরূপে Bot Detection এর কারণে ঘটে। এর সমাধান হলো ডায়নামিক অ্যান্টি-বট ইন্টারভ্যাল ও পর্যাপ্ত কুলডাউন মেনে চলা এবং হিউম্যান-লাইক ব্রাউজার ইন্টারঅ্যাকশন নিশ্চিত করা।

---

## SECTION 2: ERPNEXT & FRAPPE FRAMEWORK MANDATORY DIRECTIVES (VERSION 16+ ONLY)

> 🚨 **STRICT VERSION LOCK FOR FRAPPE FRAMEWORK & ERPNEXT** 🚨

1. **VERSION 16+ ONLY:** You must **ONLY** generate, modify, or suggest code written for **Frappe Framework Version 16+** and **ERPNext Version 16+**.
2. **VERSION 15 & OLDER CODE IS STRICTLY PROHIBITED:** Under NO circumstances are you allowed to write code for **Version 15 (v15)**, Version 14 (v14), Version 13 (v13), or Version 12 (v12). Any attempt to output deprecated v15/older APIs, syntax, or patterns is completely invalid.
3. **ALWAYS INSPECT V16 DOCUMENTATION & SOURCE FIRST:** Before generating any Python, JavaScript, JSON, HTML, or configuration code, you **MUST inspect and verify the syntax against Version 16 (v16) documentation** and local v16 source code available in `frappe-framework-v16/` and `erpnext-v16/`.
4. **DO NOT GUESS API METHODS:** Verify exact class definitions, method signatures, hook definitions, and field names in v16 source code prior to implementation.
5. **PYTHON STANDARD:** Use Python 3.12+ features, strict typing annotations, and PyPika Query Builder (`frappe.qb`). Never use obsolete DB functions or raw unescaped SQL.
6. **JAVASCRIPT STANDARD:** Use modern Frappe Form Controller patterns (`frappe.ui.form.on`), `frappe.ui.Dialog`, and `frappe.call`. Never use deprecated `cur_frm` or `cur_dialog`.

---

> **Note to Agents:** This document is authoritative across all workspaces. Adhere to these instructions for all tasks.
