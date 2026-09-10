"""
YouTube Video Uploader — First Upload
======================================
Uploads a video to YouTube using OAuth 2.0 credentials.
Reads SEO metadata (title, description, tags) from the package folder.
"""

import json
import sys
import os
from pathlib import Path

# Google API imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

REPO_ROOT = Path(__file__).resolve().parent.parent
CLIENT_SECRETS = REPO_ROOT / "client_secrets.json"
TOKEN_FILE = REPO_ROOT / "token.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube"]

# YouTube category IDs
CATEGORY_MAP = {
    "Film & Animation": "1",
    "Autos & Vehicles": "2",
    "Music": "10",
    "Pets & Animals": "15",
    "Sports": "17",
    "Travel & Events": "19",
    "Gaming": "20",
    "People & Blogs": "22",
    "Comedy": "23",
    "Entertainment": "24",
    "News & Politics": "25",
    "Howto & Style": "26",
    "Education": "27",
    "Science & Technology": "28",
    "Nonprofits & Activism": "29",
}


def get_authenticated_service():
    """Authenticate and return YouTube API service."""
    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("[Auth] Refreshing expired token...", flush=True)
            creds.refresh(Request())
        else:
            if not CLIENT_SECRETS.exists():
                raise FileNotFoundError(f"client_secrets.json not found at: {CLIENT_SECRETS}")
            print("[Auth] Opening browser for Google OAuth login...", flush=True)
            print("[Auth] Please authorize the app in your browser.", flush=True)
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
            creds = flow.run_local_server(port=8090, open_browser=True)

        # Save token for future use
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        print(f"[Auth] Token saved to: {TOKEN_FILE}", flush=True)

    return build("youtube", "v3", credentials=creds)


def upload_video(video_path: str, title: str, description: str,
                 tags: list, category: str = "Science & Technology",
                 privacy: str = "public") -> dict:
    """Upload a video to YouTube and return the response."""

    youtube = get_authenticated_service()

    category_id = CATEGORY_MAP.get(category, "28")  # Default: Science & Technology

    body = {
        "snippet": {
            "title": title[:100],  # YouTube limit
            "description": description[:5000],  # YouTube limit
            "tags": tags[:500] if tags else [],
            "categoryId": category_id,
            "defaultLanguage": "en",
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
            "madeForKids": False,
        },
    }

    print(f"\n{'='*70}", flush=True)
    print(f"  📤 UPLOADING TO YOUTUBE", flush=True)
    print(f"{'='*70}", flush=True)
    print(f"  Title:    {title[:80]}", flush=True)
    print(f"  File:     {video_path}", flush=True)
    print(f"  Size:     {os.path.getsize(video_path) / 1024 / 1024:.2f} MB", flush=True)
    print(f"  Category: {category} ({category_id})", flush=True)
    print(f"  Privacy:  {privacy}", flush=True)
    print(f"  Tags:     {len(tags)} tags", flush=True)
    print(f"{'='*70}\n", flush=True)

    media = MediaFileUpload(video_path, chunksize=1024*1024, resumable=True)

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media,
    )

    # Upload with progress
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            pct = int(status.progress() * 100)
            print(f"  [Upload] {pct}% complete...", flush=True)

    video_id = response.get("id")
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    print(f"\n  ✅ UPLOAD SUCCESSFUL!", flush=True)
    print(f"  Video ID:  {video_id}", flush=True)
    print(f"  URL:       {video_url}", flush=True)

    return {"video_id": video_id, "url": video_url, "response": response}


def upload_from_package(package_dir: str, privacy: str = "public") -> dict:
    """Upload video using metadata from a package folder."""
    pkg = Path(package_dir)

    # Find video file
    mp4_files = list(pkg.glob("*.mp4"))
    if not mp4_files:
        raise FileNotFoundError(f"No .mp4 file found in {pkg}")
    video_path = str(mp4_files[0])

    # Find metadata
    meta_files = list(pkg.glob("*YouTube_Metadata.json")) + list(pkg.glob("youtube_metadata.json"))
    if not meta_files:
        raise FileNotFoundError(f"No metadata JSON found in {pkg}")

    with open(meta_files[0], "r", encoding="utf-8") as f:
        meta = json.load(f)

    title = meta.get("title", pkg.name)
    description = meta.get("seo_description", "")
    tags = meta.get("tags", [])
    category = meta.get("category", "Science & Technology")
    pinned_comment = meta.get("pinned_comment", "")

    result = upload_video(video_path, title, description, tags, category, privacy)

    # Post pinned comment if available
    if pinned_comment and result.get("video_id"):
        try:
            youtube = get_authenticated_service()
            comment_body = {
                "snippet": {
                    "videoId": result["video_id"],
                    "topLevelComment": {
                        "snippet": {
                            "textOriginal": pinned_comment,
                        }
                    }
                }
            }
            comment_response = youtube.commentThreads().insert(
                part="snippet",
                body=comment_body,
            ).execute()
            comment_id = comment_response.get("id")
            print(f"  📌 Pinned comment posted: {pinned_comment[:60]}...", flush=True)
            result["comment_id"] = comment_id
        except Exception as e:
            print(f"  ⚠️ Could not post pinned comment: {e}", flush=True)

    return result


if __name__ == "__main__":
    # Upload first video: Rice Titan Harvester
    PACKAGE = Path(__file__).resolve().parent / "output_packaged" / "1.1.Level_10_Rice_Titan_Harvester"

    if not PACKAGE.exists():
        print(f"Package not found: {PACKAGE}")
        sys.exit(1)

    result = upload_from_package(str(PACKAGE), privacy="public")

    print(f"\n{'='*70}")
    print(f"  🎉 FIRST VIDEO UPLOADED TO YOUTUBE!")
    print(f"  URL: {result['url']}")
    print(f"{'='*70}")
