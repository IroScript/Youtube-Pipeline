import json
import random
import os

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

if __name__ == "__main__":
    generator = IdeaPromptGenerator()
    res = generator.build_single_video_prompt("Impossible Machines")
    print("=== Step 1: 5 Generated Ideas ===")
    for item in res["all_5_ideas"]:
        print(f"Idea #{item['id']}: {item['title']} -> {item['concept']}")
    print("\n=== Step 2: Selected Idea #1 & Open Montage Prompt ===")
    print("Selected Idea:", res["selected_idea"]["title"])
    print("Combined Prompt:\n", res["full_combined_prompt"])
