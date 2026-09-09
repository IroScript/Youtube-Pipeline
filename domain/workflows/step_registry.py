"""
REQ-054: Stable Step Key Catalog & Registry
===========================================
Defines canonical step keys, metadata, display specifications, and handler mappings.
Prevents hardcoded string fragmentation across services and workers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class StepSpecification:
    step_key: str
    display_name: str
    default_step_type: str
    default_timeout: int
    description: str


class StepRegistry:
    """
    Catalog of canonical step definitions in the YouTube Content Factory pipeline.
    """

    _REGISTRY: Dict[str, StepSpecification] = {
        "research": StepSpecification(
            step_key="research",
            display_name="Topic Research & Angle Selection",
            default_step_type="llm",
            default_timeout=180,
            description="Deep research on raw idea, finding viral angles and hook propositions",
        ),
        "script": StepSpecification(
            step_key="script",
            display_name="Script & Dialogue Generation",
            default_step_type="llm",
            default_timeout=240,
            description="10-level prompt escalation and final full narration script",
        ),
        "fact_check": StepSpecification(
            step_key="fact_check",
            display_name="Factual & Policy Verification",
            default_step_type="python",
            default_timeout=120,
            description="Deterministic and LLM-assisted fact-checking against YouTube Community Guidelines",
        ),
        "seo": StepSpecification(
            step_key="seo",
            display_name="SEO & Metadata Generation",
            default_step_type="llm",
            default_timeout=180,
            description="High-CTR titles, descriptions, hashtags, and searchable keywords",
        ),
        "thumbnail": StepSpecification(
            step_key="thumbnail",
            display_name="Thumbnail Generation",
            default_step_type="browser",
            default_timeout=300,
            description="Thumbnail composition, text rendering, and high-impact visual design",
        ),
        "audio": StepSpecification(
            step_key="audio",
            display_name="Voiceover & TTS Synthesis",
            default_step_type="audio",
            default_timeout=300,
            description="Bangla / multilingual neural voiceover synthesis and audio normalization",
        ),
        "video": StepSpecification(
            step_key="video",
            display_name="Video Scene Generation",
            default_step_type="browser",
            default_timeout=600,
            description="Veo 3.1 / browser video clip render with persistent profile session",
        ),
        "media_assembly": StepSpecification(
            step_key="media_assembly",
            display_name="Media Assembly & Stitching",
            default_step_type="media",
            default_timeout=360,
            description="FFmpeg concatenation, audio mixing (voiceover + BGM + SFX), and transitions",
        ),
        "qc": StepSpecification(
            step_key="qc",
            display_name="Quality Control Inspection",
            default_step_type="qc",
            default_timeout=120,
            description="Automated checks for black frames, audio desync, bitrate, and duration",
        ),
        "upload": StepSpecification(
            step_key="upload",
            display_name="YouTube Upload & Publishing",
            default_step_type="youtube",
            default_timeout=600,
            description="Resumable video upload with idempotent upload sessions and metadata attaching",
        ),
        "analytics": StepSpecification(
            step_key="analytics",
            display_name="Post-Publish Analytics Collector",
            default_step_type="python",
            default_timeout=180,
            description="Asynchronous performance feedback loop fetching YouTube stats",
        ),
    }

    @classmethod
    def get(cls, step_key: str) -> Optional[StepSpecification]:
        return cls._REGISTRY.get(step_key)

    @classmethod
    def is_valid_key(cls, step_key: str) -> bool:
        return step_key in cls._REGISTRY

    @classmethod
    def list_keys(cls) -> List[str]:
        return list(cls._REGISTRY.keys())

    @classmethod
    def list_all(cls) -> List[StepSpecification]:
        return list(cls._REGISTRY.values())

    @classmethod
    def register_custom(cls, spec: StepSpecification) -> None:
        cls._REGISTRY[spec.step_key] = spec
