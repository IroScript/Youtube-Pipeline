"""
Re-export from domain.pipeline.pipeline_row_model for backward compatibility.
The canonical model lives in domain/pipeline/ to respect architectural boundaries.
"""
from domain.pipeline.pipeline_row_model import PipelineRowState  # noqa: F401

__all__ = ["PipelineRowState"]
