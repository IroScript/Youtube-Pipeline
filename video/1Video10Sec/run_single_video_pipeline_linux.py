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

from run_single_video_pipeline import SingleVideoPipelineRunner
from extension_bridge_linux import ExtensionVideoBridgeLinux

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


class SingleVideoPipelineRunnerLinux(SingleVideoPipelineRunner):
    """
    Linux Environment Adapter for SingleVideoPipelineRunner.
    Preserves 100% of Windows logic, stage-gates, packaging, and sequencing.
    """

    def __init__(self, config_path="config_linux.json"):
        super().__init__(config_path=config_path)

        # Plug in the Linux environment adapter for ExtensionVideoBridge
        self.extension_bridge = ExtensionVideoBridgeLinux(
            config_path=self.config_path,
            extension_path=self.config.get("extension_dir"),
            max_retries=self.config.get("max_retries", 10),
            output_dir=self.base_dir
        )


if __name__ == "__main__":
    import sys
    runner = SingleVideoPipelineRunnerLinux()
    if "--single" in sys.argv or "-s" in sys.argv:
        logging.info("🎯 Executing single cycle for next pending idea in SQLite...")
        runner.run_single_cycle()
    else:
        # Execute autonomous continuous pipeline across prompts
        runner.run_autonomous_pipeline()
