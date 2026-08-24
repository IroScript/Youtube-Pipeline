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

        # Step 1 & 2: Generate/Fetch Prompt from SQLite Escalation or Ideas Generator
        prompt_source = self.config.get("prompt_source", "sqlite_escalation")
        if prompt_source == "sqlite_escalation":
            sqlite_lvl = self.config.get("sqlite_escalation_level", 10)
            db_p = self.config.get("sqlite_db_path")
            prompt_info = self.idea_generator.fetch_sqlite_escalation_prompt(level=sqlite_lvl, db_path=db_p)
            category = prompt_info.get("category", "Paddy Titan Machine")
            logging.info(f"🏛️ [SQLite Escalation Active] Selected Level {sqlite_lvl} Prompt from youtube_pipeline.db")
        else:
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

        # Step 3.5: Direct SQLite & Output_Packaged Integration (Hierarchical Naming by ID)
        idea_id = prompt_info.get("selected_idea", {}).get("id")
        if idea_id and video_path and os.path.exists(video_path):
            try:
                import shutil
                from pathlib import Path
                prompt_db_dir = Path(self.base_dir).parent.parent / "PromptDatabase"
                if str(prompt_db_dir) not in sys.path:
                    sys.path.insert(0, str(prompt_db_dir))

                from database.session import get_session
                from database.models import Idea, IdeaElement, Prompt, GeneratedVideo, Task
                from pipeline_packager import get_idea_package_folder_name, export_package_files_from_sqlite, sync_and_get_youtube_metadata_from_sqlite, OUTPUT_PACKAGED_DIR
                from sqlmodel import select

                with get_session() as session:
                    idea = session.get(Idea, idea_id)
                    if idea:
                        folder_name = get_idea_package_folder_name(idea.id, session)
                        package_folder = OUTPUT_PACKAGED_DIR / folder_name
                        package_folder.mkdir(parents=True, exist_ok=True)
                        target_video_path = package_folder / f"{folder_name}.mp4"

                        shutil.copy2(video_path, target_video_path)

                        elem_link = session.exec(select(IdeaElement).where(IdeaElement.idea_id == idea.id)).first()
                        elem_id = elem_link.element_id if elem_link else 1
                        linked_ideas = session.exec(select(Idea).join(IdeaElement).where(IdeaElement.element_id == elem_id).order_by(Idea.id)).all()
                        idea_idx = 1
                        for idx, i in enumerate(linked_ideas, 1):
                            if i.id == idea.id:
                                idea_idx = idx
                                break

                        vid_p = session.exec(select(Prompt).where(Prompt.idea_id == idea.id, Prompt.level == 10, Prompt.generation_type == "video")).first()
                        img_p = session.exec(select(Prompt).where(Prompt.idea_id == idea.id, Prompt.level == 10, Prompt.generation_type == "image")).first()

                        sync_and_get_youtube_metadata_from_sqlite(idea, elem_id, vid_p, img_p, session, skip_browser=True)
                        export_package_files_from_sqlite(idea, elem_id, idea_idx, vid_p, img_p, package_folder, session)

                        gen_v = session.exec(select(GeneratedVideo).where(GeneratedVideo.idea_id == idea.id)).first()
                        if not gen_v:
                            import uuid
                            gen_v = GeneratedVideo(
                                uuid=str(uuid.uuid4()),
                                idea_id=idea.id,
                                title=idea.title,
                                file_path=str(target_video_path),
                                file_name=f"{folder_name}.mp4",
                                file_size_bytes=target_video_path.stat().st_size,
                                duration_seconds=8.0,
                                resolution="1080x1920",
                                status="completed"
                            )
                            session.add(gen_v)
                        else:
                            gen_v.file_path = str(target_video_path)
                            gen_v.file_size_bytes = target_video_path.stat().st_size
                            gen_v.status = "completed"
                            session.add(gen_v)

                        task = session.exec(select(Task).where(Task.idea_id == idea.id)).first()
                        if task:
                            task.status = "success"
                            task.output_folder_path = str(package_folder)
                            task.video_path = str(target_video_path)
                            session.add(task)

                        session.commit()
                        logging.info(f"📦 [Direct Auto-Packaging Complete] Video & Metadata saved to: {package_folder}")
            except Exception as pkg_err:
                logging.warning(f"⚠️ Direct packaging notice: {pkg_err}")

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

    def run_autonomous_pipeline(self, max_runs: int = None, continuous: bool = None):
        """
        Runs the pipeline in an autonomous sequential loop across prompts.
        """
        if continuous is None:
            continuous = self.config.get("continuous_mode", True)
        if max_runs is None:
            max_runs = self.config.get("max_runs", 100)

        logging.info(f"🤖 Single Video Automation Pipeline Initialized (Continuous: {continuous}, Max Runs: {max_runs}).")
        
        # Check if Telegram command exists
        user_cmd = self.telegram.poll_user_command()
        if user_cmd:
            cat = self.telegram.parse_category_from_text(user_cmd)
            logging.info(f"📲 Telegram Command Received: '{user_cmd}' -> Processing Category: '{cat}'")
            self.run_single_cycle(cat)
            return

        logging.info(f"⚡ No Telegram message detected. Starting Autonomous Pipeline across all SQLite Level 10 Prompts...")
        
        runs = 0
        while continuous or runs < max_runs:
            if not continuous and runs >= max_runs:
                break
            try:
                logging.info(f"\n" + "=" * 60)
                logging.info(f"🚀 [AUTONOMOUS PIPELINE CYCLE #{runs + 1}] Processing Next Prompt...")
                logging.info("=" * 60)
                
                res = self.run_single_cycle("Impossible Machines")
                status = res.get("status")
                
                if status == "COMPLETED_SUCCESSFULLY":
                    logging.info(f"✅ [Cycle #{runs + 1} Success] Video saved at '{res['video_path']}'")
                elif status == "ALL_PROMPTS_COMPLETED":
                    logging.info("🏆 All available prompts in SQLite database have been 100% completed!")
                    break
                else:
                    logging.warning(f"⚠️ Cycle #{runs + 1} completed with status: {status}")
            except KeyboardInterrupt:
                logging.info("🛑 Pipeline stopped by user.")
                break
            except Exception as e:
                logging.error(f"❌ Error during pipeline cycle #{runs + 1}: {e}")
            
            runs += 1
            if continuous or runs < max_runs:
                logging.info("⏳ Pacing delay: Waiting 8 seconds before advancing to next prompt...")
                time.sleep(8)

if __name__ == "__main__":
    runner = SingleVideoPipelineRunner()
    # Execute autonomous continuous pipeline across prompts
    runner.run_autonomous_pipeline()
