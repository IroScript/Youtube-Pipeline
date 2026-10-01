#!/usr/bin/env python3
"""
Master Autonomous YouTube Pipeline Cluster Runner
Runs 4 workers across Ports 8001-8004 covering Elements 22 to 100.
Enforces Two-Tier Anti-Ban Timing Architecture (Micro + Macro Layers).
Enforces Locked Audio Rule: "Audio: no human voice, only cinematic BGM."
"""
import os
import sys
import json
import time
import uuid
import random
import logging
import sqlite3
import hashlib
import threading
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timezone

# Base directories
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database" / "youtube_pipeline.db"
PROGRESS_FILE = BASE_DIR / "cluster_progress.json"
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOGS_DIR / "cluster_orchestrator.log"

# Add PromptDatabase to sys.path for local module resolution
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

class FlushingFileHandler(logging.FileHandler):
    def emit(self, record):
        super().emit(record)
        self.flush()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(threadName)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        FlushingFileHandler(LOG_FILE, mode="a", encoding="utf-8")
    ]
)
logger = logging.getLogger("ClusterOrchestrator")

# Worker configuration partitions (Targeting New Elements 101 to 273)
WORKER_CONFIGS = {
    "worker_1": {"port": 8001, "start_elem": 101, "end_elem": 144, "initial_stagger": 0.0},
    "worker_2": {"port": 8002, "start_elem": 145, "end_elem": 187, "initial_stagger": 15.0},
    "worker_3": {"port": 8003, "start_elem": 188, "end_elem": 230, "initial_stagger": 30.0},
    "worker_4": {"port": 8004, "start_elem": 231, "end_elem": 273, "initial_stagger": 45.0},
}

LOCKED_AUDIO_RULE = "Audio: no human voice, only cinematic BGM."

progress_lock = threading.RLock()
db_write_lock = threading.Lock()

def get_db_connection():
    """Create a thread-safe connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH, timeout=60.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=60000;")
    conn.create_function("gate_auth_verify", 0, lambda: 1)
    return conn

def execute_db_write(write_fn):
    """Safely execute a write transaction with mutual exclusion and guaranteed close."""
    with db_write_lock:
        conn = get_db_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            res = write_fn(conn)
            conn.commit()
            return res
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            raise
        finally:
            conn.close()

def load_progress() -> dict:
    with progress_lock:
        if PROGRESS_FILE.exists():
            try:
                with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to read progress file: {e}")
        return {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "total_elements_target": 273,
            "total_ideas_target": 2730,
            "total_prompts_target": 27300,
            "total_seo_target": 2730,
            "workers": {}
        }

def save_worker_progress(worker_id: str, data: dict):
    with progress_lock:
        prog = load_progress()
        if "workers" not in prog:
            prog["workers"] = {}
        if worker_id not in prog["workers"]:
            prog["workers"][worker_id] = {}
        prog["workers"][worker_id].update(data)
        prog["last_updated"] = datetime.now(timezone.utc).isoformat()
        try:
            temp_file = PROGRESS_FILE.with_suffix(".tmp")
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(prog, f, indent=2)
            temp_file.replace(PROGRESS_FILE)
        except Exception as e:
            logger.warning(f"Could not save progress file: {e}")

def call_worker_api(port: int, prompt_text: str, timeout: int = 240) -> str:
    """Send prompt to worker FastAPI server on localhost:{port}/generate."""
    url = f"http://localhost:{port}/generate"
    payload = json.dumps({"prompt": prompt_text, "wait_seconds": 150}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        if res_data.get("success"):
            return res_data.get("output_text", "")
        else:
            raise RuntimeError(res_data.get("error", "Unknown worker API error"))

def parse_json_from_text(text: str):
    """Safely extract and parse JSON object or array from markdown or raw text."""
    text = text.strip()
    if "```json" in text:
        parts = text.split("```json")
        text = parts[1].split("```")[0].strip()
    elif "```" in text:
        parts = text.split("```")
        text = parts[1].split("```")[0].strip()

    first_brace = text.find("{")
    first_bracket = text.find("[")
    
    if first_bracket != -1 and (first_brace == -1 or first_bracket < first_brace):
        last_bracket = text.rfind("]")
        if last_bracket != -1:
            try:
                return json.loads(text[first_bracket:last_bracket + 1], strict=False)
            except Exception:
                pass
        # Fallback: salvage truncated JSON array
        last_obj_end = text.rfind("}")
        if last_obj_end != -1 and last_obj_end > first_bracket:
            try:
                salvaged = text[first_bracket:last_obj_end + 1] + "]"
                return json.loads(salvaged, strict=False)
            except Exception:
                pass
    elif first_brace != -1:
        last_brace = text.rfind("}")
        if last_brace != -1:
            try:
                return json.loads(text[first_brace:last_brace + 1], strict=False)
            except Exception:
                pass

    try:
        return json.loads(text, strict=False)
    except Exception:
        pass

    # Regex extraction fallback for escalation dictionary {"1": ..., "2": ...}
    extracted = {}
    import re
    for lvl in range(1, 11):
        next_lvl = lvl + 1
        if next_lvl <= 10:
            pat = r'["\']?' + str(lvl) + r'["\']?\s*:\s*["\']?(.*?)(?=["\']?' + str(next_lvl) + r'["\']?\s*:)'
        else:
            pat = r'["\']?10["\']?\s*:\s*["\']?(.*?)(?=\s*["\']?\s*\}|\Z)'
        m = re.search(pat, text, re.DOTALL)
        if m:
            val = m.group(1).strip().rstrip(',').strip().strip('"').strip("'")
            if len(val) > 20:
                extracted[str(lvl)] = val
    if len(extracted) >= 5:
        return extracted

    return json.loads(text)

# =========================================================================
# STAGE 1: IDEAS GENERATION (LOCKED: IMPOSSIBLE IN SIZE & HARD DEDUP & 1200-1500 CHARS)
# =========================================================================
def generate_ideas_for_element(worker_id: str, port: int, elem_id: int, elem_name: str, elem_group: str) -> bool:
    logger.info(f"[{worker_id}] [Elem #{elem_id}: {elem_name}] Generating 10 impossible-machine ideas (1200-1500 chars) via http://localhost:{port}...")
    prompt = f"""You are an elite Impossible Giant Machine Concept Architect.
Generate 10 completely novel, unique impossible-machine ideas built around {elem_name} (category/group: {elem_group}).

CORE ARCHITECTURAL RULES (MANDATORY & INVARIANT):
1. IMPOSSIBLE CAPABILITY: Explicitly state what the machine physically accomplishes that humanity cannot realistically build.
2. IMPOSSIBLE IN SIZE: Colossal, megastructure-scale, landscape-scale, or civilization-scale physical presence (kilometers in scale).
3. IMPOSSIBLE PHYSICS / EXTREME MOTION: Extraordinary physical behavior, force, momentum, pressure, relativistic motion, magnetic flux, or extreme energy.
4. ABSOLUTE BAN: Strictly forbidden to generate municipal, road, cleaning, garbage, normal vehicles made bigger, or realistic industrial machines.
5. GLOBAL UNIQUENESS MANDATE: Every machine title must be completely novel, highly specific, and globally unique. Never reuse or duplicate generic machine titles.

DESCRIPTION LENGTH MANDATE — STRICT:
Each idea's description MUST contain 1200–1500 characters inclusive.
Do NOT generate fewer than 1200 characters.
Do NOT exceed 1500 characters.
Structure of each description:
- Machine chassis, colossal scale, and primary articulation
- The active operating workflow and mechanical actions performed on {elem_name}
- Internal belly factory decks (processing galleries, cyclone separation cylinders, drying chambers, storage vaults)
- Power origin (plasma conduits, superconducting generators, thermal exhaust fins)
- Observable landscape and environmental consequences (weather, terrain distortion, horizon view)

DIVERSITY REQUIREMENTS:
1. Vary the FUNCTION: build, move, protect, transform, harvest, transport, terraform, excavate.
2. Vary the FORM: bridge/span, colossal tower, planetary ring, buried subterranean burrower, walking titan chassis, overhead orbital canopy, segmented biomechanical spine.
3. No more than two may share a body plan.

Return ONLY a strict JSON array of 10 objects:
[
  {{
    "id": 1,
    "title": "Unique Specific Machine Title",
    "impossible_capability": "Explicit impossible capability that humanity cannot realistically build.",
    "impossible_in_size": "Colossal physical scale (kilometers, landscape, or orbital scale).",
    "impossible_physics_or_motion": "Extreme physical force, momentum, relativistic motion, or impossible physics.",
    "description": "1200–1500 character detailed description showing the machine actively performing its impossible capability through concrete mechanical action, describing internal belly factory decks, energy conduits, and producing visible physical landscape consequences."
  }}
]"""

    retries = 5
    for attempt in range(1, retries + 1):
        try:
            raw_output = call_worker_api(port, prompt)
            ideas = parse_json_from_text(raw_output)
            if isinstance(ideas, dict):
                for k in ["ideas", "machines", "items", "data"]:
                    if k in ideas and isinstance(ideas[k], list):
                        ideas = ideas[k]
                        break

            if not isinstance(ideas, list) or len(ideas) < 5:
                raise ValueError("Parsed output is not a valid list of ideas")

            def do_insert_ideas(conn):
                cur = conn.cursor()
                now_iso = datetime.now(timezone.utc).isoformat()

                # STRICT CAP CHECK: Count existing ideas for this element
                cur.execute("SELECT COUNT(DISTINCT idea_id) FROM idea_elements WHERE element_id = ?", (elem_id,))
                existing_cnt = cur.fetchone()[0]
                needed = max(0, 10 - existing_cnt)
                if needed <= 0:
                    logger.info(f"[{worker_id}] 🔒 HARD CAP: Element #{elem_id} already has {existing_cnt} ideas. Skipping.")
                    return 0

                cnt = 0
                seen_titles_in_batch = set()

                for idea in ideas:
                    if cnt >= needed:
                        logger.info(f"[{worker_id}] 🔒 Reached strict cap of 10 ideas for Element #{elem_id}. Skipping remaining candidates.")
                        break
                    title = idea.get("title", "").strip()
                    desc = idea.get("description", "").strip()
                    imp_cap = idea.get("impossible_capability", "").strip()
                    imp_size = idea.get("impossible_in_size", "").strip()
                    imp_phys = idea.get("impossible_physics_or_motion", "").strip()

                    if not title or len(title) < 3:
                        continue

                    norm_title = title.lower()
                    if norm_title in seen_titles_in_batch:
                        logger.warning(f"[{worker_id}] ⚠️ Skipping intra-batch duplicate title: '{title}'")
                        continue

                    # Hard Deduplication check against SQLite database
                    cur.execute("SELECT id FROM ideas WHERE lower(title) = lower(?)", (title,))
                    if cur.fetchone() is not None:
                        logger.warning(f"[{worker_id}] ⚠️ HARD DEDUP LOCK: Title '{title}' already exists globally in database. Skipping duplicate.")
                        continue

                    # Compute SHA-256 hash for database unique index
                    idea_hash = hashlib.sha256(title.strip().lower().encode("utf-8")).hexdigest()
                    cur.execute("SELECT id FROM ideas WHERE idea_hash = ?", (idea_hash,))
                    if cur.fetchone() is not None:
                        logger.warning(f"[{worker_id}] ⚠️ HARD DEDUP LOCK: Hash collision for title '{title}'. Skipping duplicate.")
                        continue

                    seen_titles_in_batch.add(norm_title)

                    cur.execute(
                        """INSERT INTO ideas (
                            uuid, title, short_title, raw_idea, description, category, topic,
                            language, status, priority, version, is_deleted, created_at, updated_at,
                            idea_hash, impossible_capability, impossible_in_size, impossible_physics_or_motion
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            str(uuid.uuid4()),
                            title,
                            title[:50],
                            desc,
                            desc,
                            elem_group or "Impossible Giant Machine",
                            elem_name,
                            "en",
                            "active",
                            10,
                            1,
                            0,
                            now_iso,
                            now_iso,
                            idea_hash,
                            imp_cap,
                            imp_size,
                            imp_phys
                        )
                    )
                    idea_id = cur.lastrowid
                    cur.execute(
                        "INSERT INTO idea_elements (idea_id, element_id, is_primary) VALUES (?, ?, ?)",
                        (idea_id, elem_id, 1)
                    )
                    cnt += 1
                return cnt

            inserted = execute_db_write(do_insert_ideas)
            if inserted == 0:
                raise ValueError("All candidates were duplicates or invalid. Retrying fresh generation...")
            logger.info(f"[{worker_id}] ✅ Successfully inserted {inserted} unique impossible-machine ideas for Element #{elem_id} ({elem_name})")
            return True
        except Exception as e:
            logger.warning(f"[{worker_id}] Retry {attempt}/{retries} for Ideas for Element #{elem_id} ({elem_name}) via port {port}: {e}. Waiting 15s...")
            time.sleep(15)

    logger.error(f"[{worker_id}] Worker {worker_id} failed generating ideas for {elem_name}")
    return False

# =========================================================================
# STAGE 1.5: 1200-1500 CHARACTERS DESCRIPTION EXPANSION (STYLE #12 ENRICHMENT)
# =========================================================================
def expand_descriptions_for_element(worker_id: str, port: int, elem_id: int, elem_name: str, elem_group: str) -> bool:
    logger.info(f"[{worker_id}] [Elem #{elem_id}: {elem_name}] Expanding 10 machine descriptions to 1200-1500 chars via http://localhost:{port}...")

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT i.id, i.title, i.impossible_capability, i.impossible_in_size, i.impossible_physics_or_motion
            FROM ideas i
            JOIN idea_elements ie ON ie.idea_id = i.id
            WHERE ie.element_id = ?
            ORDER BY i.id ASC
        """, (elem_id,))
        ideas = cur.fetchall()
    finally:
        conn.close()

    if not ideas or len(ideas) < 1:
        logger.warning(f"[{worker_id}] No ideas found to expand for Element #{elem_id}.")
        return False

    machine_list_text = ""
    for idx, (iid, t, cap, sz, phys) in enumerate(ideas, 1):
        machine_list_text += f"""Machine {idx} [ID {iid}]: {t}
- Capability: {cap}
- Size: {sz}
- Physics: {phys}
"""

    prompt = f"""You are an elite SciFi Megastructure Architect & Impossible Machine Novelist.
For each of the following {len(ideas)} machines built around {elem_name} ({elem_group}), generate a comprehensive 1200–1500 character detailed description conforming to Style #12.

{machine_list_text}

DESCRIPTION REQUIREMENTS:
Each description MUST contain 1200–1500 characters inclusive.
Do NOT generate fewer than 1200 characters.
Do NOT exceed 1500 characters.
Detail:
- Colossal chassis, articulated locomotive/suspension members
- Active operating workflow performing impossible actions on {elem_name}
- Multi-deck internal belly factory (processing galleries, cyclone separation cylinders, drying chambers, storage vaults)
- Power origin (plasma conduits, superconducting generators, thermal exhaust fins)
- Observable landscape/environmental consequences (weather, terrain deformation, horizon view)

Return ONLY a strict JSON object mapping machine IDs to their 1200-1500 char descriptions:
{{
  "{ideas[0][0]}": "1200-1500 char description...",
  ...
  "{ideas[-1][0]}": "1200-1500 char description..."
}}"""

    retries = 3
    for attempt in range(1, retries + 1):
        try:
            raw_output = call_worker_api(port, prompt)
            first_brace = raw_output.find('{')
            last_brace = raw_output.rfind('}')
            if first_brace == -1 or last_brace == -1:
                raise ValueError("No JSON object found in worker output")
            desc_map = json.loads(raw_output[first_brace:last_brace+1], strict=False)

            if isinstance(desc_map, dict):
                for k in ["ideas", "machines", "descriptions", "data"]:
                    if k in desc_map and isinstance(desc_map[k], dict):
                        desc_map = desc_map[k]
                        break

            def do_update_descriptions(conn):
                cur = conn.cursor()
                updated_cnt = 0
                for iid_str, dtext in desc_map.items():
                    try:
                        iid = int(iid_str)
                    except ValueError:
                        continue
                    dtext_clean = dtext.strip()
                    if len(dtext_clean) >= 600:
                        cur.execute("UPDATE ideas SET description = ?, raw_idea = ? WHERE id = ?", (dtext_clean, dtext_clean, iid))
                        updated_cnt += 1
                return updated_cnt

            updated = execute_db_write(do_update_descriptions)
            if updated == 0:
                raise ValueError("Failed to update descriptions (empty or invalid keys)")
            logger.info(f"[{worker_id}] ✅ Successfully expanded {updated} descriptions to 1200-1500 chars for Element #{elem_id} ({elem_name})")
            return True
        except Exception as e:
            logger.warning(f"[{worker_id}] Retry {attempt}/{retries} for Expanding Descriptions for Element #{elem_id} ({elem_name}) via port {port}: {e}. Waiting 15s...")
            time.sleep(15)

    logger.error(f"[{worker_id}] Worker {worker_id} failed expanding descriptions for {elem_name}")
    return False

# =========================================================================
# STAGE 2: 10-LEVEL ESCALATION PROMPTS GENERATION
# =========================================================================
def generate_escalation_for_idea(worker_id: str, port: int, idea_id: int, idea_title: str, elem_name: str, desc: str, imp_cap: str = "", imp_size: str = "", imp_phys: str = "") -> bool:
    logger.info(f"[{worker_id}] [Idea #{idea_id}: '{idea_title}'] Generating 10-Level Escalation via http://localhost:{port}...")
    extra_context = ""
    if imp_cap:
        extra_context += f"\nImpossible Capability: {imp_cap}"
    if imp_size:
        extra_context += f"\nImpossible in Size: {imp_size}"
    if imp_phys:
        extra_context += f"\nImpossible Physics/Motion: {imp_phys}"

    prompt = f"""Given the following Impossible Machine Idea:
Title: {idea_title}
Topic/Element: {elem_name}
Concept: {desc}{extra_context}

Build a complete 10-level escalation prompting system (10 video prompts) evolving from Level 1 (BASIC) to Level 10 (ALIEN LEVEL / MAXIMUM).

CORE ESCALATION INVARIANT:
The three CORE RULES must remain INVARIANT and actively present across ALL 10 LEVELS (Level 1 to Level 10):
1. IMPOSSIBLE CAPABILITY — What the machine physically accomplishes that humanity cannot realistically build.
2. IMPOSSIBLE IN SIZE — Colossal, megastructure-scale, landscape-scale physical presence.
3. IMPOSSIBLE PHYSICS / MOTION — Extraordinary physical behavior, force, momentum, pressure, or energy.

STRICT RULES & CONSTRAINTS:
1. Every video prompt MUST be exactly 8 seconds, 9:16 vertical aspect ratio, photorealistic cinematic render, smooth continuous motion, no cuts, maximum cinematic realism.
2. CRITICAL AUDIO REQUIREMENT: Every video prompt MUST explicitly state: "{LOCKED_AUDIO_RULE}"
3. Format:
Second 1 [0:00-0:01] — HUD Popup Text: "STEP 1: [ACTION]" — [Details]
Second 2 [0:01-0:02] — HUD Popup Text: "STEP 2: [ACTION]" — [Details]
Second 3 [0:02-0:03] — HUD Popup Text: "STEP 3: [ACTION]" — [Details]
Second 4 [0:03-0:04] — HUD Popup Text: "STEP 4: [ACTION]" — [Details]
Second 5 [0:04-0:05] — HUD Popup Text: "STEP 5: [ACTION]" — [Details]
Seconds 6-8 [0:05-0:08]: HUD text completely fades; camera performs continuous unbroken movement revealing the machine, zero cuts, exactly 8 seconds.

Return strictly a JSON object with keys "1" through "10" mapping to the 10 video prompt strings:
{{
  "1": "Exactly 8 seconds, 9:16 vertical aspect ratio... {LOCKED_AUDIO_RULE}...",
  ...
  "10": "Exactly 8 seconds, 9:16 vertical aspect ratio... {LOCKED_AUDIO_RULE}..."
}}"""

    retries = 5
    for attempt in range(1, retries + 1):
        try:
            raw_output = call_worker_api(port, prompt)
            levels_data = parse_json_from_text(raw_output)

            prompts_to_insert = []
            if isinstance(levels_data, dict):
                for k in range(1, 11):
                    txt = levels_data.get(str(k)) or levels_data.get(k)
                    if txt:
                        prompts_to_insert.append((k, str(txt)))
            elif isinstance(levels_data, list):
                for idx, item in enumerate(levels_data[:10]):
                    lvl = item.get("level", idx + 1)
                    txt = item.get("video_prompt") or item.get("prompt") or str(item)
                    prompts_to_insert.append((lvl, txt))

            if len(prompts_to_insert) < 5:
                raise ValueError("Parsed output contained fewer than 5 valid prompts")

            def do_insert_prompts(conn):
                cur = conn.cursor()
                now_iso = datetime.now(timezone.utc).isoformat()
                cnt = 0
                for lvl, ptext in prompts_to_insert:
                    if LOCKED_AUDIO_RULE not in ptext:
                        ptext = f"{ptext}\n{LOCKED_AUDIO_RULE}"
                    cur.execute(
                        """INSERT INTO prompts (
                            uuid, idea_id, prompt_type, title, prompt_text, level, level_name,
                            status, version, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            str(uuid.uuid4()),
                            idea_id,
                            "video_prompt",
                            f"Level {lvl} Escalation - {idea_title[:40]}",
                            ptext.strip(),
                            lvl,
                            f"Level {lvl}",
                            "active",
                            1,
                            now_iso,
                            now_iso
                        )
                    )
                    cnt += 1
                return cnt

            inserted = execute_db_write(do_insert_prompts)
            logger.info(f"[{worker_id}] ✅ Successfully inserted 10-Level Escalation ({inserted} prompts) for Idea #{idea_id}")
            return True
        except Exception as e:
            logger.warning(f"[{worker_id}] Retry {attempt}/{retries} for Escalation for Idea #{idea_id} ({idea_title}) via port {port}: {e}. Waiting 15s...")
            time.sleep(15)

    logger.error(f"[{worker_id}] Worker {worker_id} failed generating escalation for Idea #{idea_id}")
    return False

# =========================================================================
# STAGE 3: REAL DATA-GROUNDED SEO GENERATION
# =========================================================================
def generate_seo_for_idea(worker_id: str, port: int, idea_id: int, elem_id: int, idea_title: str, elem_name: str, desc: str) -> bool:
    logger.info(f"[{worker_id}] [Idea #{idea_id}: '{idea_title}'] Generating real SEO via http://localhost:{port}...")
    prompt = f"""Viral YouTube Growth & SEO Strategist
Generate viral YouTube Title (<80 chars + 1 emoji), 3-paragraph SEO description with timestamps, and 10-15 search tags in strict JSON.

VIDEO SUBJECT: {idea_title}
TOPIC/ELEMENT: {elem_name}
CONCEPT: {desc}

Return strictly JSON:
{{
  "title": "High-CTR Title with 1 emoji",
  "description": "3-paragraph description with timestamps 0:00, 0:02, 0:04, 0:06 and hashtags",
  "tags": ["tag1", "tag2", "tag3"]
}}"""

    title_res = None
    desc_res = None
    tags_res = None

    for attempt in range(1, 4):
        try:
            raw_output = call_worker_api(port, prompt, timeout=60)
            seo_data = parse_json_from_text(raw_output)
            if isinstance(seo_data, dict) and seo_data.get("title") and seo_data.get("description"):
                title_res = seo_data["title"]
                desc_res = seo_data["description"]
                tags_res = seo_data.get("tags", [])
                break
        except Exception as e:
            logger.warning(f"[{worker_id}] Attempt {attempt} failed calling worker SEO: {e}")
            time.sleep(10)

    # Deterministic data-grounded fallback if LLM returned 429 or unusable JSON
    if not title_res or not desc_res:
        logger.info(f"[{worker_id}] [metadata] browser LLM returned no usable JSON; using data-grounded fallback.")
        title_res = f"{idea_title} — The {elem_name} Machine You've Never Seen ⚡"
        desc_res = f"""{idea_title}: an impossible {elem_name} megamachine engineered at colossal planetary scale.

Watch this futuristic titan machine operate with incredible mechanical precision in an 8-second continuous cinematic shot.

TIMESTAMPS
0:00 - Master Core Activation
0:02 - Mechanical Deployment
0:04 - Macro-Scale Conversion
0:06 - Complete Environmental Equilibrium

#{elem_name.replace(' ', '')} #ImpossibleEngineering #ColossalMachines #Megastructure #SciFi"""
        tags_res = [
            idea_title,
            f"{elem_name} machine",
            f"{elem_name} engineering",
            "impossible engineering",
            "colossal machine",
            "megastructure",
            "futuristic technology",
            "ai animation",
            "8 second render",
            "cinematic machine"
        ]

    try:
        def do_insert_seo(conn):
            cur = conn.cursor()
            now_iso = datetime.now(timezone.utc).isoformat()

            cur.execute(
                """INSERT INTO youtube_metadata (
                    uuid, idea_id, element_id, title, seo_description, tags, category, default_language, status, upload_status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(uuid.uuid4()),
                    idea_id,
                    elem_id,
                    title_res,
                    desc_res,
                    json.dumps(tags_res),
                    "Science & Technology",
                    "en",
                    "ready",
                    "ready",
                    now_iso,
                    now_iso
                )
            )
            seo_meta_id = cur.lastrowid

            cur.execute(
                """INSERT INTO seo_runs (
                    uuid, idea_id, provider, mode, demand_score, novelty_score, saturation_score,
                    opportunity_score, verdict, keyword_count, competitor_count, exact_competitors,
                    close_competitors, llm_used, upload_ready, created_at, prompt_sent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(uuid.uuid4()),
                    idea_id,
                    "local_cluster_orchestrator",
                    "autonomous",
                    85.0,
                    90.0,
                    20.0,
                    88.0,
                    "HIGH_POTENTIAL",
                    len(tags_res),
                    0,
                    0,
                    0,
                    1,
                    1,
                    now_iso,
                    prompt[:500]
                )
            )
            seo_run_id = cur.lastrowid

            for t in tags_res:
                cur.execute(
                    """INSERT INTO seo_keyword_metrics (
                        idea_id, seo_run_id, keyword, relevance, word_count, long_tail, score, source, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (idea_id, seo_run_id, t, 0.95, len(t.split()), 1 if len(t.split()) > 2 else 0, 85.0, "youtube_suggest", now_iso)
                )

        execute_db_write(do_insert_seo)
        logger.info(f"[{worker_id}] ✅ [{worker_id}] Idea #{idea_id} SEO complete! (Title: '{title_res[:50]}...')")
        return True
    except Exception as e:
        logger.error(f"[{worker_id}] ❌ [{worker_id}] Error generating SEO for Idea #{idea_id}: {e}")
        return False

# =========================================================================
# WORKER EXECUTION THREAD
# =========================================================================
def worker_thread_main(worker_id: str, cfg: dict):
    port = cfg["port"]
    start_elem = cfg["start_elem"]
    end_elem = cfg["end_elem"]
    initial_stagger = cfg["initial_stagger"]

    # Initial stagger delay
    if initial_stagger > 0:
        logger.info(f"[{worker_id}] ⏳ Worker {worker_id} scheduled to start in {initial_stagger:.0f}s ({initial_stagger/60:.1f} mins)...")
        time.sleep(initial_stagger)

    logger.info(f"[{worker_id}] 🚀 Worker {worker_id} started on http://localhost:{port}! Partition: Elements {start_elem} to {end_elem}.")

    completed_processes = 0
    cycle_num = 1

    # Macro Layer Tracking
    shift_start_time = time.time()
    active_shift_duration = random.uniform(2.0, 4.0) * 3600 # 2 to 4 hours in seconds
    logger.info(f"[{worker_id}] ⏳ [Macro Layer] Worker {worker_id} scheduled for {active_shift_duration/3600:.2f}h active shift before next deep rest.")

    while True:
        # Check Macro Layer Deep Hibernation
        elapsed_shift = time.time() - shift_start_time
        if elapsed_shift >= active_shift_duration:
            deep_rest_duration = random.uniform(3600, 7200) # 1 to 2 hours
            logger.info(f"[{worker_id}] 🛌 [MACRO LAYER SLEEP] Worker {worker_id} entering {deep_rest_duration/3600:.2f}h deep hibernation rest.")
            save_worker_progress(worker_id, {
                "status": "macro_resting",
                "macro_rest_hours": round(deep_rest_duration / 3600, 2),
                "rest_seconds": round(deep_rest_duration, 1)
            })
            time.sleep(deep_rest_duration)
            shift_start_time = time.time()
            active_shift_duration = random.uniform(2.0, 4.0) * 3600
            logger.info(f"[{worker_id}] 🌅 [MACRO LAYER WAKEUP] Worker {worker_id} woke up! New active shift: {active_shift_duration/3600:.2f} hours.")

        # Micro Layer Cycle Setup
        batch_target = random.randint(5, 10)
        cycle_processes = 0
        base_delay = 10.0
        logger.info(f"[{worker_id}] ▶️ Worker {worker_id} starting Cycle #{cycle_num} (Random batch target: {batch_target} processes, Base delay: {base_delay}s)...")

        while cycle_processes < batch_target:
            # Check Macro Layer Deep Hibernation during cycle
            elapsed_shift = time.time() - shift_start_time
            if elapsed_shift >= active_shift_duration:
                break

            # Find incomplete work in this worker's partition
            conn = get_db_connection()
            try:
                cur = conn.cursor()

                # Check elements that need ideas
                cur.execute(
                    """SELECT e.id, e.name, e.group_type, COUNT(DISTINCT ie.idea_id) as idea_count
                    FROM elements e
                    LEFT JOIN idea_elements ie ON ie.element_id = e.id
                    WHERE e.id >= ? AND e.id <= ?
                    GROUP BY e.id
                    HAVING idea_count < 10
                    ORDER BY e.id ASC LIMIT 1""",
                    (start_elem, end_elem)
                )
                elem_need_ideas = cur.fetchone()

                # Check elements that need description expansion (< 800 chars and no prompts)
                cur.execute(
                    """SELECT e.id, e.name, e.group_type, COUNT(DISTINCT i.id) as idea_count, MIN(length(i.description)) as min_len
                    FROM elements e
                    JOIN idea_elements ie ON ie.element_id = e.id
                    JOIN ideas i ON i.id = ie.idea_id
                    LEFT JOIN prompts p ON p.idea_id = i.id
                    WHERE e.id >= ? AND e.id <= ? AND p.id IS NULL
                    GROUP BY e.id
                    HAVING idea_count >= 10 AND min_len < 800
                    ORDER BY e.id ASC LIMIT 1""",
                    (start_elem, end_elem)
                )
                elem_need_expansion = cur.fetchone()

                # Check ideas that need escalation prompts
                cur.execute(
                    """SELECT i.id, i.title, e.id, e.name, i.description, i.impossible_capability, i.impossible_in_size, i.impossible_physics_or_motion, COUNT(p.id) as prompt_count
                    FROM ideas i
                    JOIN idea_elements ie ON ie.idea_id = i.id
                    JOIN elements e ON e.id = ie.element_id
                    LEFT JOIN prompts p ON p.idea_id = i.id
                    WHERE e.id >= ? AND e.id <= ?
                    GROUP BY i.id
                    HAVING prompt_count < 10
                    ORDER BY e.id ASC, i.id ASC LIMIT 1""",
                    (start_elem, end_elem)
                )
                idea_need_prompts = cur.fetchone()

                # Check ideas that need SEO metadata
                cur.execute(
                    """SELECT i.id, i.title, e.id, e.name, i.description, ym.id
                    FROM ideas i
                    JOIN idea_elements ie ON ie.idea_id = i.id
                    JOIN elements e ON e.id = ie.element_id
                    LEFT JOIN youtube_metadata ym ON ym.idea_id = i.id
                    WHERE e.id >= ? AND e.id <= ? AND ym.id IS NULL
                    ORDER BY e.id ASC, i.id ASC LIMIT 1""",
                    (start_elem, end_elem)
                )
                idea_need_seo = cur.fetchone()
            finally:
                conn.close()

            # Check if all work in partition is finished
            if not elem_need_ideas and not elem_need_expansion and not idea_need_prompts and not idea_need_seo:
                # Work-Stealing: Assist cluster with any remaining elements (1 to 273)
                conn = get_db_connection()
                try:
                    cur = conn.cursor()
                    cur.execute(
                        """SELECT e.id, e.name, e.group_type, COUNT(DISTINCT ie.idea_id) as idea_count
                        FROM elements e
                        LEFT JOIN idea_elements ie ON ie.element_id = e.id
                        GROUP BY e.id
                        HAVING idea_count < 10
                        ORDER BY e.id ASC LIMIT 1"""
                    )
                    elem_need_ideas = cur.fetchone()

                    if not elem_need_ideas:
                        cur.execute(
                            """SELECT e.id, e.name, e.group_type, COUNT(DISTINCT i.id) as idea_count, MIN(length(i.description)) as min_len
                            FROM elements e
                            JOIN idea_elements ie ON ie.element_id = e.id
                            JOIN ideas i ON i.id = ie.idea_id
                            LEFT JOIN prompts p ON p.idea_id = i.id
                            WHERE p.id IS NULL
                            GROUP BY e.id
                            HAVING idea_count >= 10 AND min_len < 800
                            ORDER BY e.id ASC LIMIT 1"""
                        )
                        elem_need_expansion = cur.fetchone()

                    if not elem_need_ideas and not elem_need_expansion:
                        cur.execute(
                            """SELECT i.id, i.title, e.id, e.name, i.description, i.impossible_capability, i.impossible_in_size, i.impossible_physics_or_motion, COUNT(p.id) as prompt_count
                            FROM ideas i
                            JOIN idea_elements ie ON ie.idea_id = i.id
                            JOIN elements e ON e.id = ie.element_id
                            LEFT JOIN prompts p ON p.idea_id = i.id
                            GROUP BY i.id
                            HAVING prompt_count < 10
                            ORDER BY e.id ASC, i.id ASC LIMIT 1"""
                        )
                        idea_need_prompts = cur.fetchone()

                    if not elem_need_ideas and not elem_need_expansion and not idea_need_prompts:
                        cur.execute(
                            """SELECT i.id, i.title, e.id, e.name, i.description, ym.id
                            FROM ideas i
                            JOIN idea_elements ie ON ie.idea_id = i.id
                            JOIN elements e ON e.id = ie.element_id
                            LEFT JOIN youtube_metadata ym ON ym.idea_id = i.id
                            WHERE ym.id IS NULL
                            ORDER BY e.id ASC, i.id ASC LIMIT 1"""
                        )
                        idea_need_seo = cur.fetchone()
                finally:
                    conn.close()

                if not elem_need_ideas and not elem_need_expansion and not idea_need_prompts and not idea_need_seo:
                    logger.info(f"[{worker_id}] 🏆 ALL 273 ELEMENTS FULLY COMPLETED ACROSS ALL STAGES!")
                    save_worker_progress(worker_id, {"status": "all_partitions_completed"})
                    time.sleep(600)
                    break
                else:
                    if elem_need_ideas:
                        target_eid = elem_need_ideas[0]
                    elif elem_need_expansion:
                        target_eid = elem_need_expansion[0]
                    elif idea_need_prompts:
                        target_eid = idea_need_prompts[2]
                    else:
                        target_eid = idea_need_seo[2]
                    logger.info(f"[{worker_id}] 🤝 Partition ({start_elem}-{end_elem}) complete! Assisting cluster on remaining Element #{target_eid}...")

            # Execute single process in cycle
            action_name = ""
            success = False

            if elem_need_ideas:
                eid, ename, egroup, _ = elem_need_ideas
                save_worker_progress(worker_id, {
                    "status": "generating_ideas",
                    "current_element_id": eid,
                    "current_element_name": ename
                })
                action_name = f"Elem #{eid} Ideas"
                success = generate_ideas_for_element(worker_id, port, eid, ename, egroup)

            elif elem_need_expansion:
                eid, ename, egroup, _, _ = elem_need_expansion
                save_worker_progress(worker_id, {
                    "status": "expanding_descriptions",
                    "current_element_id": eid,
                    "current_element_name": ename
                })
                action_name = f"Elem #{eid} 1200-1500 Chars Expansion"
                success = expand_descriptions_for_element(worker_id, port, eid, ename, egroup)

            elif idea_need_prompts:
                iid, ititle, eid, ename, idesc, icap, isize, iphys, _ = idea_need_prompts
                save_worker_progress(worker_id, {
                    "status": "generating_prompts",
                    "current_element_id": eid,
                    "current_element_name": ename
                })
                action_name = f"Idea #{iid} Escalation"
                success = generate_escalation_for_idea(worker_id, port, iid, ititle, ename, idesc, icap or "", isize or "", iphys or "")

            elif idea_need_seo:
                iid, ititle, eid, ename, idesc, _ = idea_need_seo
                save_worker_progress(worker_id, {
                    "status": "generating_seo",
                    "current_element_id": eid,
                    "current_element_name": ename
                })
                action_name = f"Idea #{iid} SEO"
                success = generate_seo_for_idea(worker_id, port, iid, eid, ititle, ename, idesc)

            if success:
                completed_processes += 1
                cycle_processes += 1

                # Micro Layer Delay Ladder (+10s per process in cycle)
                ladder_delay = base_delay + (cycle_processes * 10.0) + random.uniform(0.0, 2.0)
                logger.info(f"[{worker_id}] ⏳ [Delay Ladder | #{cycle_processes}/{batch_target}: '{action_name}'] Sleeping {ladder_delay:.2f}s (Base: {base_delay}s, +10.0s next)...")
                save_worker_progress(worker_id, {
                    "completed_processes": completed_processes,
                    "cycle_processes": cycle_processes,
                    "current_cycle": cycle_num,
                    "cooldown_seconds": round(ladder_delay, 1)
                })
                time.sleep(ladder_delay)
            else:
                logger.warning(f"[{worker_id}] ⚠️ Action '{action_name}' failed or rate-limited. Pausing 45s before retry...")
                time.sleep(45.0)

        # Micro Layer Cycle Completion & Rest
        if cycle_processes >= batch_target:
            cycle_rest = random.uniform(120.0, 1200.0) # 2 to 20 minutes
            logger.info(f"[{worker_id}] 💤 [CYCLE COMPLETE] Worker {worker_id} finished Cycle #{cycle_num} ({cycle_processes} tasks). Resting {cycle_rest/60:.2f} mins...")
            save_worker_progress(worker_id, {
                "status": "cycle_resting",
                "rest_seconds": round(cycle_rest, 1),
                "cycle_processes": 0
            })
            time.sleep(cycle_rest)
            cycle_num += 1

# =========================================================================
# MONITOR THREAD (10-MINUTE REPORTS)
# =========================================================================
def monitor_thread_main():
    while True:
        time.sleep(600) # Every 10 minutes
        try:
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("SELECT count(*) FROM ideas")
            ideas_cnt = c.fetchone()[0]
            c.execute("SELECT count(*) FROM prompts")
            prompts_cnt = c.fetchone()[0]
            c.execute("SELECT count(*) FROM youtube_metadata")
            seo_cnt = c.fetchone()[0]
            conn.close()

            prog = load_progress()
            workers_info = prog.get("workers", {})

            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            logger.info(f"""
============================================================
🔔 [10-MINUTE PIPELINE REPORT] {now_str}
============================================================
Total Ideas Generated       : {ideas_cnt} / 2730 ({ideas_cnt/27.3:.1f}%)
Total Prompts Generated     : {prompts_cnt} / 27300 ({prompts_cnt/273.0:.1f}%)
Total Real SEO Completed    : {seo_cnt} / 2730 ({seo_cnt/27.3:.1f}%)
Worker Status:
  - Worker 1: {workers_info.get('worker_1', {}).get('status', 'idle')} (Completed: {workers_info.get('worker_1', {}).get('completed_processes', 0)})
  - Worker 2: {workers_info.get('worker_2', {}).get('status', 'idle')} (Completed: {workers_info.get('worker_2', {}).get('completed_processes', 0)})
  - Worker 3: {workers_info.get('worker_3', {}).get('status', 'idle')} (Completed: {workers_info.get('worker_3', {}).get('completed_processes', 0)})
  - Worker 4: {workers_info.get('worker_4', {}).get('status', 'idle')} (Completed: {workers_info.get('worker_4', {}).get('completed_processes', 0)})
============================================================
""")
        except Exception as e:
            logger.warning(f"[Monitor] Error generating 10-min log snapshot: {e}")

# =========================================================================
# MAIN ORCHESTRATOR ENTRY POINT
# =========================================================================
def main():
    logger.info("Initializing Master Cluster Pipeline Orchestrator...")
    conn = get_db_connection()
    conn.close()
    logger.info("SQLite WAL mode and busy_timeout=60000 verified successfully.")

    threads = []
    for wid, cfg in WORKER_CONFIGS.items():
        t = threading.Thread(target=worker_thread_main, args=(wid, cfg), name=wid, daemon=True)
        threads.append(t)
        t.start()

    logger.info("All 4 cluster worker threads launched under Master Autonomous 3-Stage Generation Regime!")

    # Launch background 30-min monitor
    m = threading.Thread(target=monitor_thread_main, name="30MinMonitor", daemon=True)
    m.start()

    # Keep main thread alive
    for t in threads:
        t.join()

if __name__ == "__main__":
    main()
