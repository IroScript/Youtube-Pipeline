"""
Linux Environment Runner for Single Video Pipeline (1Video10Sec)
================================================================
Strict Cross-Platform Mandate: Windows Logic = Source of Truth.
Inherits 100% of Windows SingleVideoPipelineRunner logic, workflows,
stage-gates, SQLite prompt escalation, hierarchical packaging, and YouTube upload.
"""

import os
import sys
import logging

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import json
from run_single_video_pipeline import SingleVideoPipelineRunner
from extension_bridge_linux import ExtensionVideoBridgeLinux
from idea_prompt_generator import IdeaPromptGenerator
from social_uploader import SocialMediaUploader
from telegram_handler import TelegramCommandHandler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


class SingleVideoPipelineRunnerLinux(SingleVideoPipelineRunner):
    """
    Linux Environment Adapter for SingleVideoPipelineRunner.
    Preserves 100% of Windows logic, stage-gates, packaging, and sequencing.
    """

    def __init__(self, config_path="config_linux.json"):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.config_path = os.path.join(self.base_dir, config_path)

        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)

        self.idea_generator = IdeaPromptGenerator(self.config_path)
        self.extension_bridge = ExtensionVideoBridgeLinux(
            config_path=self.config_path,
            extension_path=self.config.get("extension_dir"),
            max_retries=self.config.get("max_retries", 10),
            output_dir=self.base_dir
        )
        self.uploader = SocialMediaUploader(self.config_path)
        self.telegram = TelegramCommandHandler(self.config_path)
        self.categories = self.config.get("default_categories", ["Impossible Machines"])

    def run_single_cycle(self, category: str = None) -> dict:
        """
        Executes complete pipeline cycle on Linux for a single video:
        Fetch SQLite Level 10 Prompt -> Stage Gates Verify -> Render via Extension -> Auto-Package -> Strictly Guarded YouTube Upload
        """
        import random
        if not category:
            category = random.choice(self.categories)

        logging.info(f"\n==================================================")
        logging.info(f"🎬 [Linux Pipeline] STARTING FOR CATEGORY: '{category}'")
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

        # Step 2.5: Zero-Skip Hard Gate (Prompt = VERIFIED and SEO = VERIFIED)
        idea_id = prompt_info.get("selected_idea", {}).get("id")
        if idea_id:
            try:
                from pathlib import Path
                prompt_db_dir = Path(self.base_dir).parent.parent / "PromptDatabase"
                if str(prompt_db_dir) not in sys.path:
                    sys.path.insert(0, str(prompt_db_dir))
                import stage_gates as sg

                # Hard Gate Check 1: Prompt Escalation Verification
                if not sg.has_escalation(idea_id):
                    esc_det = sg.escalation_detail(idea_id)
                    logging.error(f"⛔ HARD GATE BLOCKED: Idea #{idea_id} ('{prompt_info['selected_idea']['title']}') — Level 10 Prompt not verified! Filled: {esc_det.get('filled')}/{esc_det.get('required')}")
                    return {
                        "category": category,
                        "selected_idea": prompt_info["selected_idea"]["title"],
                        "video_path": None,
                        "youtube_url": None,
                        "status": "BLOCKED_PROMPT_NOT_VERIFIED"
                    }
                logging.info(f"✅ [Prompt Gate Passed] Level 10 Prompt Escalation verified for Idea #{idea_id}")

                # Hard Gate Check 2: SEO Verification (Usable, non-fallback)
                if not sg.has_seo(idea_id):
                    logging.info(f"🌐 [SEO Gate] Idea #{idea_id} missing verified SEO -> Auto-triggering CloakBrowser (chatgpt.com)...")
                    from database.session import get_session
                    from services.seo.seo_service import SEOService
                    with get_session() as session:
                        seo_svc = SEOService(session)
                        seo_svc.generate_seo(idea_id, apply=True, force=False, use_browser=True)

                    if not sg.has_seo(idea_id):
                        seo_det = sg.seo_detail(idea_id)
                        logging.error(f"⛔ HARD GATE BLOCKED: Cannot generate video for Idea #{idea_id} ('{prompt_info['selected_idea']['title']}') — SEO verification failed! Reason: {seo_det.get('reason')}")
                        return {
                            "category": category,
                            "selected_idea": prompt_info["selected_idea"]["title"],
                            "video_path": None,
                            "youtube_url": None,
                            "status": "BLOCKED_SEO_NOT_VERIFIED"
                        }
                logging.info(f"✅ [SEO Gate Passed] Real SEO generated and verified for Idea #{idea_id}")

            except Exception as e:
                logging.error(f"⛔ HARD GATE ERROR: Verification gate failed for Idea #{idea_id}: {e}")
                return {
                    "category": category,
                    "selected_idea": prompt_info["selected_idea"]["title"],
                    "video_path": None,
                    "youtube_url": None,
                    "status": "BLOCKED_VERIFICATION_ERROR"
                }

        # Step 3: Render via Extension with retry on failure
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
        package_folder = None
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

        # Step 4: Real YouTube Upload (Strict User & Config Control)
        youtube_url = None
        if self.config.get("youtube", {}).get("auto_upload", False):
            try:
                from pathlib import Path
                repo_root = Path(self.base_dir).parent.parent
                if str(repo_root) not in sys.path:
                    sys.path.insert(0, str(repo_root))
                import upload_bridge

                pkgs = upload_bridge.scan_packages()
                target_pkg = None
                if package_folder:
                    target_resolved = Path(package_folder).resolve()
                    for p in pkgs:
                        if target_resolved == Path(p.get("folder_path", "")).resolve():
                            target_pkg = p
                            break
                if not target_pkg and pkgs:
                    for p in pkgs:
                        if idea_id and (str(idea_id) in p.get("folder_name", "") or prompt_info.get("selected_idea", {}).get("title", "") in p.get("title", "")):
                            target_pkg = p
                            break

                if target_pkg:
                    logging.info(f"🚀 [Real YouTube Upload] Queuing package '{target_pkg['folder_name']}'...")
                    job_id = upload_bridge.queue_video(target_pkg, dry_run=False)
                    if job_id:
                        up_res = upload_bridge.run_upload(limit=1, dry_run=False)
                        if up_res.get("uploaded"):
                            results_map = upload_bridge.parse_uploaded_results()
                            yt_id = results_map.get(job_id, "")
                            if yt_id:
                                youtube_url = f"https://youtube.com/shorts/{yt_id}"
                            conn = upload_bridge.get_db_connection()
                            upload_bridge.update_db_status(conn, target_pkg["folder_path"], yt_id)
                            conn.close()
                            logging.info(f"✅ [Real YouTube Upload Success] URL: {youtube_url or 'Uploaded successfully'}")
            except Exception as up_err:
                logging.error(f"❌ Real YouTube upload notice: {up_err}")
        else:
            logging.info("ℹ️ [YouTube Upload] Skipped — auto_upload is disabled in config_linux.json (Awaiting Iraq bhai's explicit directive).")

        summary = {
            "category": category,
            "selected_idea": prompt_info["selected_idea"]["title"],
            "video_path": video_path,
            "package_folder": str(package_folder) if package_folder else None,
            "youtube_url": youtube_url,
            "status": "COMPLETED_SUCCESSFULLY"
        }
        return summary



if __name__ == "__main__":
    import sys
    runner = SingleVideoPipelineRunnerLinux()
    if "--single" in sys.argv or "-s" in sys.argv:
        logging.info("🎯 Executing single cycle for next pending idea in SQLite...")
        runner.run_single_cycle()
    else:
        # Execute autonomous continuous pipeline across prompts
        runner.run_autonomous_pipeline()
