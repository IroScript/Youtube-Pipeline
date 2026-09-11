তুমি এখন কোনো নতুন feature “complete” ঘোষণা করবে না শুধু code edit বা unit test pass করার ভিত্তিতে।

এই কাজের জন্য **CLAIM ≠ PROOF**।

তোমাকে প্রতিটি requirement-এর জন্য implementation এবং তার বাস্তব evidence দুটোই দিতে হবে।

## ABSOLUTE RULE

কোনো requirement-এর status “IMPLEMENTED”, “VERIFIED”, “PROVEN”, “PRODUCTION READY” বলা যাবে না যতক্ষণ না তার corresponding evidence দেখানো হয়েছে।

### প্রতিটি requirement-এর জন্য এই 7টি জিনিস বাধ্যতামূলক:

1. Requirement ID
2. Exact implementation file + function/class
3. Exact code behavior
4. Test scenario
5. Exact test command
6. Actual test output
7. Pass/Fail verdict

---

# REQUIREMENT TRACEABILITY MATRIX

একটি পূর্ণ matrix তৈরি করো:

| ID | Requirement | Code Location | Test | Evidence | Status |
|---|---|---|---|---|---|

প্রতিটি requirement-এর পাশে “PROVEN” লিখতে হলে executable evidence থাকতে হবে।

---

# NO SELF-DECLARED SUCCESS

এই ধরনের statement গ্রহণযোগ্য নয়:

“implemented”
“looks correct”
“should work”
“all good”
“production ready”
“proven”

যদি তার সঙ্গে বাস্তব command/output/evidence না থাকে।

---

# CODE EXISTENCE IS NOT BEHAVIOR PROOF

কোনো file তৈরি হয়েছে মানেই feature implemented নয়।

কোনো function আছে মানেই function কাজ করছে নয়।

কোনো unit test pass মানেই production behavior proven নয়।

---

# REQUIRED TEST LEVELS

প্রতিটি critical requirement অন্তত এই স্তরে যাচাই করবে:

### Level 1 — Static Verification
Import, syntax, type/reference, route registration, dependency integrity।

### Level 2 — Unit Verification
Function-level expected behavior।

### Level 3 — Integration Verification
Database + API + service interaction।

### Level 4 — Failure Injection
ইচ্ছাকৃতভাবে failure তৈরি করে system সঠিকভাবে থামে কি না।

### Level 5 — Recovery Verification
Failure-এর পরে restart/resume করলে state ঠিকভাবে recover হয় কি না।

### Level 6 — Concurrency Verification
একই কাজ দুই process/request একসাথে চালালে duplicate execution হয় কি না।

### Level 7 — End-to-End Verification
Real pipeline sequence দিয়ে dependency-to-output chain যাচাই করবে।

---

# ZERO-BLANK PROOF

“blank prevention implemented” বলবে না।

বাস্তবে test করবে:

### Test ZB-01
একটি row-তে ঠিক 1টি required field blank।

Expected:

```text
ROW = INCOMPLETE
NEXT ROW = BLOCKED
NEXT STAGE = BLOCKED
MISSING FIELD = IDENTIFIED
```

### Test ZB-02
30টি required field blank।

Expected:

```text
ALL 30 = DETECTED
ALL 30 = REPAIRED
FULL ROW REVALIDATED
ONLY THEN NEXT ROW
```

### Test ZB-03
অনেক row থাকলেও Row N incomplete রেখে Row N+1 processing-এর চেষ্টা করবে।

Expected:

```text
N+1 MUST NOT START
```

---

# IMPORTANT: REQUIRED FIELD DEFINITION

“blank” rule schema-aware হতে হবে।

প্রথমে প্রতিটি table/entity-এর জন্য:

```text
required field
optional field
nullable field
derived field
system-generated field
```

এই classification বের করবে।

Optional/nullable field-কে required blank হিসেবে গণ্য করবে না।

কিন্তু required field blank হলে processing অবশ্যই block হবে।

---

# ROW-BY-ROW PROOF

বাস্তব test data দিয়ে প্রমাণ করবে:

```text
Row 1 = incomplete
Row 2 = complete
```

Expected:

```text
Row 1 processed
Row 2 NOT processed
```

তারপর Row 1-এর missing data repair করবে।

Expected:

```text
Row 1 = VERIFIED
Row 2 = NOW ELIGIBLE
```

এরপর একইভাবে Row 3, Row 4 ...

---

# DUPLICATE EXECUTION PROOF

একই logical video-এর জন্য একসাথে দুইটি generation request তৈরি করার চেষ্টা করবে।

Expected:

```text
Request A = accepted
Request B = rejected / deduplicated
Generated jobs = exactly 1
```

এই test অবশ্যই concurrent execution দিয়ে করতে হবে।

Sequential double-call যথেষ্ট নয়।

---

# STALE FILE/PATH PROOF

এই scenario অবশ্যই test করবে:

```text
DB says video = complete
Filesystem video = deleted
```

Expected:

```text
REAL STATE = MISSING
STALE STATE MUST NOT BE TRUSTED
VIDEO REGENERATION ELIGIBILITY = DETECTED
```

তারপর নতুন video তৈরি হলে path পুনরায় discover হবে।

Hardcoded stale path ব্যবহার করা যাবে না।

---

# DEPENDENCY GATE PROOF

এই exact scenario test করবে:

```text
1.3 Prompt = VERIFIED
1.3 SEO = MISSING
1.3 Video = MISSING
```

Expected:

```text
Prompt generation = SKIPPED
SEO generation = REQUIRED
Video generation = BLOCKED
```

তারপর:

```text
SEO = VERIFIED
```

Expected:

```text
Video generation = ALLOWED
```

---

# INSERTION PROOF

External AI/browser generated data database-এ insert করার পর:

```text
GENERATE
→ PARSE
→ VALIDATE
→ INSERT
→ READ BACK
→ COMPARE
→ VERIFY
```

Read-back mismatch হলে:

```text
STAGE = NOT COMPLETE
NEXT STAGE = BLOCKED
```

---

# VIDEO GENERATION PROOF

Video generation-এর আগে machine-verifiable gate দেখাবে:

```text
Prompt verified = TRUE
SEO verified = TRUE
Duplicate job = FALSE
Target UUID verified = TRUE
Target row complete = TRUE
Existing valid video = FALSE
```

একটির যেকোনো একটি FALSE হলে:

```text
VIDEO GENERATION MUST NOT EXECUTE
```

এটি failure-injection test দিয়ে প্রমাণ করবে।

---

# UPLOAD PROOF

শুধু upload request পাঠানো success নয়।

প্রমাণ করতে হবে:

```text
UPLOAD REQUEST
→ REMOTE ACTION
→ RESPONSE
→ REMOTE STATE CHECK
→ DATABASE UPDATE
→ READ-BACK
```

Upload API response পাওয়া মাত্র “UPLOAD_COMPLETE” লেখা যাবে না।

---

# PAUSE PROOF

বাস্তবে pipeline running অবস্থায় pause করবে।

তারপর verify করবে:

```text
No new job started
No duplicate job created
Current state persisted
```

---

# CRASH RECOVERY PROOF

প্রতিটি critical stage-এ process terminate করে restart test করবে।

উদাহরণ:

```text
PROMPT_GENERATING
→ PROCESS KILLED
→ RESTART
```

Expected:

```text
STATE RECOVERED
NO DUPLICATE GENERATION
RESUME FROM CORRECT STATE
```

একইভাবে:

```text
SEO_GENERATING
VIDEO_GENERATING
UPLOADING
```

প্রতিটি test করবে।

---

# END-TO-END PROOF

একটি বাস্তব test item নিয়ে সম্পূর্ণ sequence চালাবে:

```text
CURRENT VIDEO EXISTS
→ NEXT ITEM DISCOVER
→ PROMPT CHECK
→ SEO CHECK
→ VIDEO GATE
→ VIDEO GENERATION
→ FILE VERIFICATION
→ UPLOAD
→ UPLOAD VERIFICATION
→ NEXT ITEM DISCOVERY
```

প্রতিটি transition-এর evidence capture করবে।

---

# TEST OUTPUT MUST BE SHOWN

শুধু:

```text
28/28 passed
```

গ্রহণযোগ্য evidence নয়।

প্রতিটি critical test-এর জন্য command এবং relevant output দেখাবে।

উদাহরণ:

```text
Command:
python -m pytest tests/... -v

Expected:
duplicate jobs = 1

Actual:
duplicate jobs = 1

Result:
PASS
```

---

# NEGATIVE TESTS ARE MANDATORY

শুধু success-path test করা যাবে না।

প্রতিটি critical stage-এর জন্য:

```text
SUCCESS
FAILURE
TIMEOUT
DUPLICATE
PARTIAL DATA
STALE STATE
PROCESS CRASH
RESTART
CONCURRENT REQUEST
```

test করবে।

---

# FULL REGRESSION RULE

Existing tests pass করা যথেষ্ট নয়।

নতুন implementation-এর কারণে existing behavior break হয়েছে কি না সেটা আলাদা করে prove করতে হবে।

যদি কোনো test fail করে:

```text
FAILURE
→ ROOT CAUSE
→ PRE-EXISTING OR OUR CHANGE
→ EVIDENCE
→ FIX OR ACCEPT
→ RE-RUN
```

“pre-existing” শুধু বলা যাবে না।

Baseline comparison বা direct evidence দিতে হবে।

---

# NO EXCUSED FAILURES WITHOUT PROOF

কোনো failure-কে “pre-existing” ঘোষণা করলে:

1. exact failing test
2. exact error
3. affected file
4. baseline evidence
5. কেন current change-এর কারণে নয়
6. post-fix retest result

দিতে হবে।

---

# FINAL VERDICT RULE

শেষে তিনটির একটিই status ব্যবহার করবে:

### PROVEN
সব critical requirement executable evidence দিয়ে verified।

### PARTIALLY PROVEN
কিছু requirement verified, কিছু incomplete।

### NOT PROVEN
code exists বা tests pass করেছে, কিন্তু production behavior যথেষ্ট evidence দিয়ে verified নয়।

**“PRODUCTION READY” এবং “PROVEN” একই জিনিস নয়।**

Production-ready বলতে end-to-end, failure, recovery, concurrency এবং regression evidence থাকতে হবে।

---

# FINAL REPORT

শেষ report-এ এই format বাধ্যতামূলক:

```text
REQUIREMENT
IMPLEMENTATION
TEST
EXPECTED
ACTUAL
EVIDENCE
STATUS
```

এবং শেষে:

```text
Total requirements
Implemented
Unit-tested
Integration-tested
Failure-tested
Recovery-tested
Concurrency-tested
End-to-end-tested
Unverified
Known failures
Known risks
```

সবশেষে কোনো uncertainty থাকলে সেটি explicitly লিখবে।

**কোনো evidence ছাড়া PROVEN শব্দ ব্যবহার করা সম্পূর্ণ নিষিদ্ধ।**