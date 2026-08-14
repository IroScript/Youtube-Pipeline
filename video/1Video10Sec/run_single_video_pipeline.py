import os
import sys
import time
import json
import logging
import random
from idea_prompt_generator import IdeaPromptGenerator
from extension_bridge import ExtensionVideoBridge
from social_uploader import SocialMediaUploader
from telegram_handler import TelegramCommandHandler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class SingleVideoPipelineRunner:
    """
    Main orchestrator for single video generation & social posting pipeline.
    Runs via a single command.
    """
    def __init__(self, config_path="config.json"):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.config_path = os.path.join(self.base_dir, config_path)
        
        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)

        self.idea_generator = IdeaPromptGenerator(self.config_path)
        self.extension_bridge = ExtensionVideoBridge(
            extension_path=self.config.get("extension_dir"),
            max_retries=self.config.get("max_retries", 10),
            output_dir=self.base_dir
        )
        self.uploader = SocialMediaUploader(self.config_path)
        self.telegram = TelegramCommandHandler(self.config_path)
        self.categories = self.config.get("default_categories", ["Impossible Machines"])

    def run_single_cycle(self, category: str = None) -> dict:
        """
        Executes complete pipeline cycle for a single video:
        5 Ideas -> Pick Random Creative Idea -> Open Montage Prompt -> 10-Retry Render -> Auto Post
        """
        if not category:
            category = random.choice(self.categories)

        logging.info(f"\n==================================================")
        logging.info(f"🎬 PIPELINE STARTING FOR CATEGORY: '{category}'")
        logging.info(f"==================================================")

        # Step 1 & 2: Generate 5 Ideas, Pick #1, Build Open Montage Prompt
        prompt_info = self.idea_generator.build_single_video_prompt(category)
        
        logging.info(f"💡 5 Ideas Generated. Selected #1: '{prompt_info['selected_idea']['title']}'")
        logging.info(f"📜 Generated Prompt: {prompt_info['full_combined_prompt']}")

        # Step 3: Render via Extension with 10-time retry on failure
        video_path = self.extension_bridge.generate_single_video(prompt_info)

        if not video_path or not os.path.exists(video_path):
            logging.warning("⚠️ Real MP4 video is currently generating/pending download on Google Flow.")
            return {
                "category": category,
                "selected_idea": prompt_info["selected_idea"]["title"],
                "video_path": None,
                "youtube_url": None,
                "status": "WAITING_FOR_GOOGLE_FLOW_RENDER"
            }

        # Step 4: Auto upload to YouTube Shorts and Social Media
        upload_info = self.uploader.upload_video(video_path, prompt_info)

        summary = {
            "category": category,
            "selected_idea": prompt_info["selected_idea"]["title"],
            "video_path": video_path,
            "youtube_url": upload_info.get("youtube_url"),
            "status": "COMPLETED_SUCCESSFULLY"
        }
        return summary

    def run_autonomous_pipeline(self, max_runs: int = 1):
        """
        Runs the pipeline across categories or listens to Telegram user commands.
        """
        logging.info("🤖 Single Video Automation Pipeline Initialized.")
        
        # Check if Telegram command exists
        user_cmd = self.telegram.poll_user_command()
        if user_cmd:
            cat = self.telegram.parse_category_from_text(user_cmd)
            logging.info(f"📲 Telegram Command Received: '{user_cmd}' -> Processing Category: '{cat}'")
            self.run_single_cycle(cat)
            return

        # Autonomous loop with randomized category selection
        logging.info(f"⚡ No Telegram message detected. Starting Autonomous Mode across {len(self.categories)} Categories...")
        
        shuffled_categories = list(self.categories)
        random.shuffle(shuffled_categories)
        
        runs = 0
        for cat in shuffled_categories:
            if runs >= max_runs:
                break
            try:
                res = self.run_single_cycle(cat)
                logging.info(f"✅ Finished Category '{cat}': Video saved at '{res['video_path']}'")
            except Exception as e:
                logging.error(f"❌ Error during pipeline cycle for '{cat}': {e}")
            runs += 1

if __name__ == "__main__":
    runner = SingleVideoPipelineRunner()
    # Execute a run cycle
    runner.run_autonomous_pipeline(max_runs=1)
