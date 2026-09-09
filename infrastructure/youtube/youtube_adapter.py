"""
YouTube Adapter Infrastructure Module
=====================================
Exports YouTubeAdapter and YouTubeCredentialsMissingError from services.youtube.youtube_adapter.
"""

from services.youtube.youtube_adapter import YouTubeAdapter, YouTubeCredentialsMissingError

__all__ = ["YouTubeAdapter", "YouTubeCredentialsMissingError"]
