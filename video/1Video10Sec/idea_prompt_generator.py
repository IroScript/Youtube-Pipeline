import sys
import os
import re
import json
import random
import logging

class IdeaPromptGenerator:
    """
    Generates 5 ideas for a given category, picks #1 idea,
    and formats a single 10-second video prompt in Open Montage / Cinematic style.
    """
    def __init__(self, config_path="config.json"):
        self.config_path = config_path
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)
        else:
            self.config = {"max_retries": 10, "prompt_style": "open_montage_cinematic"}

    def generate_5_ideas(self, category: str) -> list:
        """
        Step 1: Generate 5 distinct creative video ideas for the category.
        """
        category_lower = category.lower()
        
        if "impossible machine" in category_lower:
            ideas = [
                {
                    "id": 1,
                    "title": "The Perpetual Quantum Gearwork Mechanism",
                    "concept": "A floating mechanical heart made of brass and glowing plasma rings, defiance of gravity with infinite mechanical rotation.",
                    "style": "Open Montage Cinematic"
                },
                {
                    "id": 2,
                    "title": "Anti-Gravity Hourglass Engine",
                    "concept": "An inverted hourglass where liquid mercury flows upwards into floating bronze cogwheels.",
                    "style": "Cinematic Surrealism"
                },
                {
                    "id": 3,
                    "title": "Hyperdimensional Chrono Sphere",
                    "concept": "A concentric crystalline sphere bending light rays and refracting mini galaxies within a clockwork maze.",
                    "style": "Hyper-Realistic Sci-Fi"
                },
                {
                    "id": 4,
                    "title": "The Infinite Tesla Dynamo",
                    "concept": "Giant copper coils suspended over a dark abyss emitting silent violet lightning bolts into a floating crystal core.",
                    "style": "Dark Cinematic Cyberpunk"
                },
                {
                    "id": 5,
                    "title": "Solaris Molecular Reconstructor",
                    "concept": "A intricate golden sphere unpacking tiny robotic brass arms in zero-gravity space.",
                    "style": "Macro Photorealistic Montage"
                }
            ]
        elif "futuristic machine" in category_lower:
            ideas = [
                {
                    "id": 1,
                    "title": "Atmospheric Nano-Terraformer Core",
                    "concept": "A towering obsidian monolith glowing with cyan light beams purifying toxic storm clouds in a futuristic megacity.",
                    "style": "Open Montage Cinematic"
                },
                {
                    "id": 2,
                    "title": "Sub-Light Quantum Transceiver",
                    "concept": "A sleek silver torus ring hovering over neon oceans projecting holographic stellar maps into deep space.",
                    "style": "Cinematic Sci-Fi"
                },
                {
                    "id": 3,
                    "title": "Cybernetic Neural Weaver",
                    "concept": "Golden fiber-optic filaments weaving complex biological brain networks inside a glass containment tube.",
                    "style": "Bio-Tech Realism"
                },
                {
                    "id": 4,
                    "title": "Gravity-Warp Levitation Foundry",
                    "concept": "Molten blue plasma suspended in mid-air by magnetic rings forming futuristic alloy armor.",
                    "style": "High-Tech Industrial"
                },
                {
                    "id": 5,
                    "title": "Zero-Point Solar Synthesizer",
                    "concept": "A miniature artificial sun trapped inside a rotating diamond cage producing infinite clean energy.",
                    "style": "Cosmic Cinematic"
                }
            ]
        else:
            ideas = [
                {
                    "id": 1,
                    "title": f"{category} - Primary Impossible Construct",
                    "concept": f"An incredible 10-second visual display of {category} with glowing energy conduits and self-assembling mechanical parts.",
                    "style": "Open Montage Cinematic"
                },
                {
                    "id": 2,
                    "title": f"{category} - Secondary Prototype",
                    "concept": f"Cinematic close-up of {category} operating with smooth gear shifts and luminescent light patterns.",
                    "style": "Cinematic Macro"
                },
                {
                    "id": 3,
                    "title": f"{category} - Quantum Matrix",
                    "concept": f"Futuristic visualization of {category} harnessing anti-gravity forces in a high-tech laboratory.",
                    "style": "Sci-Fi Surreal"
                },
                {
                    "id": 4,
                    "title": f"{category} - Steampunk Engine",
                    "concept": f"Intricate brass and copper wheels turning endlessly with soft steam clouds and golden light rays.",
                    "style": "Steampunk Masterpiece"
                },
                {
                    "id": 5,
                    "title": f"{category} - Celestial Assembly",
                    "concept": f"Cosmic scale view of {category} assembling itself in zero gravity surrounded by distant nebulae.",
                    "style": "Cosmic Realism"
                }
            ]
        return ideas

    def build_single_video_prompt(self, category: str) -> dict:
        """
        Step 1: Generate 5 ideas
        Step 2: Pick #1 Idea and format Open Montage / Cinematic Single Video Prompt.
        """
        ideas = self.generate_5_ideas(category)
        selected_idea = random.choice(ideas)  # Randomly pick from the 5 creative ideas
        
        target_dur = self.config.get("target_duration_seconds", 8)
        aspect = self.config.get("aspect_ratio", "9:16")
        model = self.config.get("model", "Veo 3.1 Lower Priority")
        
        # Pacing tailored for 8-second cinematic display: 0.0-2.5s (Macro), 2.5-5.5s (Wide Reveal), 5.5-8.0s (Action Dynamic)
        if target_dur == 8:
            combined_prompt = (
                f"0.0-2.5s: Extreme close-up of {selected_idea['title']} starting its intricate mechanism, glowing cyan plasma rings rotating in mid-air. "
                f"2.5-5.5s: Camera smoothly pans wide revealing the full impossible mechanical architecture of {selected_idea['concept']} defying gravity. "
                f"5.5-8.0s: Slow motion macro shot of energy pulsing through polished brass cogs and glass conduits, hyper-detailed cinematic lighting, 8k resolution."
            )
        else:
            combined_prompt = (
                f"0.0-3.5s: Extreme close-up of {selected_idea['title']} starting its intricate mechanism, glowing cyan plasma rings rotating in mid-air. "
                f"3.5-7.0s: Camera smoothly pans wide revealing the full impossible mechanical architecture of {selected_idea['concept']} defying gravity. "
                f"7.0-10.0s: Slow motion macro shot of energy pulsing through polished brass cogs and glass conduits, hyper-detailed cinematic lighting, 8k resolution."
            )

        prompt_data = {
            "category": category,
            "all_5_ideas": ideas,
            "selected_idea_number": selected_idea.get("id", 1),
            "selected_idea": selected_idea,
            "target_duration": target_dur,
            "duration": f"{target_dur}s",
            "aspect_ratio": aspect,
            "model": model,
            "openmontage_prompt": {
                "subject": f"The impossible machine construct '{selected_idea['title']}': {selected_idea['concept']}",
                "environment": "A dimly lit high-tech futuristic laboratory with soft blue ambient volumetric light and floating particles.",
                "camera": "Slow dramatic 360-degree orbital push-in shot with seamless depth of field blur.",
                "lighting": "Low-key cinematic lighting with high contrast neon glows, brass reflections, and subtle light flares.",
                "style": "Open Montage Cinematic, 8K Ultra Photorealistic, Octane Render, 60fps smooth fluid dynamics"
            },
            "full_combined_prompt": combined_prompt
        }
        return prompt_data

    def fetch_sqlite_escalation_prompt(self, level: int = 10, db_path: str = None) -> dict:
        """
        Fetches next sequential uncompleted Level 10 escalation prompt directly from SQLite database
        using strict sequential hierarchy (Element 1 -> Idea 1 -> Idea 2 -> ... -> Element 100).
        """
        target_dur = self.config.get("target_duration_seconds", 8)
        aspect = self.config.get("aspect_ratio", "9:16")
        model = self.config.get("model", "Veo 3.1 Lower Priority")

        try:
            from pathlib import Path
            prompt_db_dir = Path(__file__).resolve().parent.parent.parent / "PromptDatabase"
            venv_site_packages = prompt_db_dir / ".venv" / "Lib" / "site-packages"
            if venv_site_packages.exists() and str(venv_site_packages) not in sys.path:
                sys.path.insert(0, str(venv_site_packages))
            if str(prompt_db_dir) not in sys.path:
                sys.path.insert(0, str(prompt_db_dir))

            from prompt_chain_engine import get_or_create_next_production_ready_prompt

            # STAGE-GATE RULE: "level 10 escalation exists? yes -> skip. no -> regenerate
            # from CloakBrowser chatgpt.com."
            #
            # This call previously passed skip_browser=True. That did NOT make it faster for
            # finished ideas -- the resolver already returns an idea with 20 filled prompts
            # without launching anything. What it did was make every idea with MISSING prompts
            # fall into prompt_chain_engine's hardcoded offline placeholder instead of being
            # generated, which is why level-10 prompts repeated across ideas. Passing False
            # reconnects the render path to real generation; the browser opens only when an
            # escalation is genuinely absent.
            #
            # RENDER_SKIP_BROWSER=1 restores the old offline behaviour for testing.
            _render_skip_browser = os.getenv("RENDER_SKIP_BROWSER", "0") == "1"
            ready_item = get_or_create_next_production_ready_prompt(skip_browser=_render_skip_browser)

            lvl10_vid = ready_item.get("level_10_video_prompt")
            idea_id = ready_item.get("idea_id")
            title = ready_item.get("idea_title")

            # The resolver reports READY_FOR_VIDEO even when generation failed and left no
            # level-10 row, which would send an EMPTY prompt to Veo. Raising here hands control
            # to this method's existing `except` fallback (direct sequential SQL query), which
            # returns a real stored prompt instead. Guard only -- no resolver logic changed.
            if not lvl10_vid or not (lvl10_vid.prompt_text or "").strip():
                raise ValueError(
                    f"Idea #{idea_id} ('{title}') resolved with no usable Level 10 video prompt "
                    f"(escalation stage incomplete)"
                )

            lvl_name = lvl10_vid.level_name if lvl10_vid else "ALIEN LEVEL / MAXIMUM"
            prompt_text = lvl10_vid.prompt_text if lvl10_vid else ""

            # Clean prompt text: strip any leading image references and normalize all whitespace/newlines
            clean_text = prompt_text
            for i in range(1, 11):
                clean_text = clean_text.replace(f"Use IMAGE {i:02d} as the first frame and reference image. ", "")
                clean_text = clean_text.replace(f"Use IMAGE {i} as the first frame and reference image. ", "")
                clean_text = clean_text.replace(f"Use IMAGE {i:02d} as the first frame and reference image.", "")
                clean_text = clean_text.replace(f"Use IMAGE {i} as the first frame and reference image.", "")

            clean_text = " ".join(clean_text.split())

            selected_idea = {
                "id": idea_id,
                "title": title,
                "concept": f"Level 10 ({lvl_name}) Impossible Colossal Machine with 5-Step HUD Popups",
                "level": 10,
                "level_name": lvl_name,
                "style": "Alien Level Maximum Escalation"
            }

            prompt_data = {
                "category": f"Element {ready_item.get('idea_topic', 'Paddy Titan Machine')} - Level 10",
                "all_5_ideas": [selected_idea],
                "selected_idea_number": 1,
                "selected_idea": selected_idea,
                "target_duration": target_dur,
                "duration": f"{target_dur}s",
                "aspect_ratio": aspect,
                "model": model,
                "full_combined_prompt": clean_text.strip()
            }
            return prompt_data

        except Exception as e:
            logging.warning(f"⚠️ Notice using prompt_chain_engine: {e}. Falling back to sequential SQL query...")
            if not db_path:
                db_path = self.config.get(
                    "sqlite_db_path",
                    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "PromptDatabase", "database", "youtube_pipeline.db")
                )
            import sqlite3
            if not os.path.exists(db_path):
                return self.build_single_video_prompt("Impossible Machines")

            con = sqlite3.connect(db_path)
            cur = con.cursor()
            
            output_dir = Path(db_path).parent.parent / "output_packaged"
            packaged_titles = set()
            if output_dir.exists():
                for f in output_dir.iterdir():
                    if f.is_dir() and any(f.glob("*.mp4")):
                        packaged_titles.add(f.name.lower())

            cur.execute(
                """
                SELECT id, idea_id, level, level_name, title, prompt_text 
                FROM prompts 
                WHERE generation_type='video' 
                  AND level=? 
                  AND length(prompt_text) > 50 
                  AND idea_id NOT IN (SELECT idea_id FROM generated_videos WHERE status='completed')
                  AND idea_id NOT IN (SELECT idea_id FROM youtube_metadata WHERE status='uploaded' OR youtube_video_id IS NOT NULL)
                  AND idea_id NOT IN (SELECT id FROM ideas WHERE status IN ('completed', 'uploaded', 'published'))
                ORDER BY idea_id ASC, id ASC
                """,
                (level,)
            )
            rows = cur.fetchall()
            con.close()

            row = None
            for r in rows:
                p_id, i_id, lvl_val, l_name, t_str, p_txt = r
                clean_t = re.sub(r'_+', '_', re.sub(r'[^a-zA-Z0-9_\-]', '_', t_str)).strip('_').lower()
                is_packaged = any(clean_t in pf for pf in packaged_titles)
                if not is_packaged:
                    row = r
                    break

            if not row and rows:
                row = rows[0]

            if not row:
                return self.build_single_video_prompt("Impossible Machines")

            prompt_id, idea_id, lvl, lvl_name, title, prompt_text = row
            clean_text = prompt_text
            for i in range(1, 11):
                clean_text = clean_text.replace(f"Use IMAGE {i:02d} as the first frame and reference image. ", "")
                clean_text = clean_text.replace(f"Use IMAGE {i} as the first frame and reference image. ", "")
                clean_text = clean_text.replace(f"Use IMAGE {i:02d} as the first frame and reference image.", "")
                clean_text = clean_text.replace(f"Use IMAGE {i} as the first frame and reference image.", "")
            clean_text = " ".join(clean_text.split())

            selected_idea = {
                "id": idea_id,
                "title": title,
                "concept": f"Level {lvl} ({lvl_name}) Impossible Colossal Machine with 5-Step HUD Popups",
                "level": lvl,
                "level_name": lvl_name,
                "style": "Alien Level Maximum Escalation"
            }

            return {
                "category": f"Paddy Titan Machine - Level {lvl}",
                "all_5_ideas": [selected_idea],
                "selected_idea_number": 1,
                "selected_idea": selected_idea,
                "target_duration": target_dur,
                "duration": f"{target_dur}s",
                "aspect_ratio": aspect,
                "model": model,
                "full_combined_prompt": clean_text.strip()
            }


if __name__ == "__main__":
    generator = IdeaPromptGenerator()
    res = generator.fetch_sqlite_escalation_prompt(level=10)
    print("=== Next Sequential Level 10 SQLite Escalation Prompt ===")
    print("Idea ID:", res["selected_idea"]["id"])
    print("Title:", res["selected_idea"]["title"])
    print("Prompt:\n", res["full_combined_prompt"])
