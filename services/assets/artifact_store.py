"""
REQ-076: Content-Addressed Artifact Store (SHA256)
==================================================
Manages immutable file storage organized strictly by SHA256 content address.
Guarantees zero-corruption artifact storage for scripts, audio, thumbnails, and video.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass(frozen=True)
class ArtifactMetadata:
    sha256: str
    size_bytes: int
    storage_path: str
    extension: str


class ContentAddressedArtifactStore:
    """
    Local / disk CAS repository.
    Path layout: <base_dir>/<sha256[:2]>/<sha256[2:4]>/<sha256>.<extension>
    """

    def __init__(self, base_dir: Path | str):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, sha256_hash: str, extension: str = "bin") -> Path:
        ext = extension.lstrip(".")
        sub_dir = self.base_dir / sha256_hash[:2] / sha256_hash[2:4]
        sub_dir.mkdir(parents=True, exist_ok=True)
        return sub_dir / f"{sha256_hash}.{ext}"

    def store_bytes(self, data: bytes, extension: str = "bin") -> ArtifactMetadata:
        sha256_hash = hashlib.sha256(data).hexdigest()
        dest_path = self._resolve_path(sha256_hash, extension)

        if not dest_path.exists():
            dest_path.write_bytes(data)

        return ArtifactMetadata(
            sha256=sha256_hash,
            size_bytes=len(data),
            storage_path=str(dest_path),
            extension=extension.lstrip("."),
        )

    def get_bytes(self, sha256_hash: str, extension: str = "bin") -> Optional[bytes]:
        path = self._resolve_path(sha256_hash, extension)
        if path.exists():
            data = path.read_bytes()
            # Verify integrity on read
            if hashlib.sha256(data).hexdigest() == sha256_hash:
                return data
        return None

    def exists(self, sha256_hash: str, extension: str = "bin") -> bool:
        path = self._resolve_path(sha256_hash, extension)
        return path.exists()

    def verify_integrity(self, sha256_hash: str, extension: str = "bin") -> bool:
        data = self.get_bytes(sha256_hash, extension)
        return data is not None
