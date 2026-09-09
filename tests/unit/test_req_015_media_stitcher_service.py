"""
REQ-015: Media Assembly & Stitcher Service
==========================================
Dedicated automated test suite proving:
1. MediaStitcherService initialization.
2. Handling of invalid/non-existent input shots (returns failed status with error).
3. Handling of valid shot paths (returns success status, created output directory, shot count).
4. Support for both str and Path object arguments.
"""

import sys
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.video.media_stitcher_service import MediaStitcherService


def test_req_015_stitcher_invalid_shots(tmp_path):
    """Verify stitcher gracefully fails when no input files exist."""
    stitcher = MediaStitcherService()
    non_existent = [tmp_path / "fake1.mp4", tmp_path / "fake2.mp4"]
    output = tmp_path / "output.mp4"

    res = stitcher.stitch_shots(non_existent, output)
    assert res["status"] == "failed"
    assert "No valid shot paths found" in res["error"]


def test_req_015_stitcher_empty_list(tmp_path):
    """Verify stitcher gracefully fails with empty shot list."""
    stitcher = MediaStitcherService()
    res = stitcher.stitch_shots([], tmp_path / "output.mp4")
    assert res["status"] == "failed"
    assert "No valid shot paths found" in res["error"]


def test_req_015_stitcher_valid_shots(tmp_path):
    """Verify stitcher succeeds when valid shots are provided and creates target directory."""
    stitcher = MediaStitcherService()
    
    shot1 = tmp_path / "shot_01.mp4"
    shot2 = tmp_path / "shot_02.mp4"
    shot1.write_bytes(b"dummy_shot_1_content")
    shot2.write_bytes(b"dummy_shot_2_content")

    out_dir = tmp_path / "assembled_dir"
    output_file = out_dir / "final_assembled.mp4"

    res = stitcher.stitch_shots([shot1, str(shot2)], str(output_file))
    assert res["status"] == "success"
    assert res["total_shots"] == 2
    assert Path(res["output_path"]).resolve() == output_file.resolve()
    assert out_dir.is_dir()
