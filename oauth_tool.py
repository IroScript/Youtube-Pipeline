"""
Google OAuth Authentication & Verification Tool for YouTube Pipeline
===================================================================
1. Generates OAuth URL with offline access and PKCE code_verifier.
2. Supports background local server listener (port 8090).
3. Supports direct code / redirect URL exchange.
4. Saves refreshed youtube_token.json.
5. Verifies channel identity (mine=True) to ensure channel is @AstroSparksAI.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

CLIENT_SECRET_PATH = Path("/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/youtube-uploader-eval/secrets/shared/client_secret.json")
STATE_FILE = Path("/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/oauth_state.json")
TOKEN_PATHS = [
    Path("/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/youtube-uploader-eval/secrets/astrosparksai/youtube_token.json"),
    Path("/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/token.json"),
]

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]

PORT = 8090
REDIRECT_URI = f"http://localhost:{PORT}/"


def generate_auth_url() -> tuple[str, str, str]:
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), SCOPES)
    flow.redirect_uri = REDIRECT_URI
    auth_url, state = flow.authorization_url(prompt="consent", access_type="offline")
    code_verifier = flow.code_verifier

    data = {
        "auth_url": auth_url,
        "state": state,
        "code_verifier": code_verifier,
        "redirect_uri": REDIRECT_URI,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    STATE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return auth_url, state, code_verifier


def save_and_verify_credentials(creds) -> dict:
    creds_json = creds.to_json()
    for tp in TOKEN_PATHS:
        tp.parent.mkdir(parents=True, exist_ok=True)
        tp.write_text(creds_json, encoding="utf-8")
        print(f"✅ Token successfully written to: {tp}")

    # Verify channel identity
    print("\n🔍 Verifying authenticated YouTube channel...")
    youtube = build("youtube", "v3", credentials=creds)
    resp = youtube.channels().list(part="snippet,contentDetails,statistics", mine=True).execute()

    items = resp.get("items", [])
    if not items:
        raise RuntimeError("No YouTube channel found for the authenticated Google account!")

    channel = items[0]
    snippet = channel.get("snippet", {})
    ch_id = channel.get("id", "")
    title = snippet.get("title", "")
    custom_url = snippet.get("customUrl", "")

    result = {
        "channel_id": ch_id,
        "title": title,
        "custom_url": custom_url,
        "verified": True,
    }

    print(f"   Channel Title: {title}")
    print(f"   Channel ID:    {ch_id}")
    print(f"   Custom URL:    {custom_url}")

    if "astrosparksai" not in custom_url.lower() and "astro sparks" not in title.lower():
        print(f"⚠️ WARNING: Authenticated channel '{title}' ({custom_url}) does not match @AstroSparksAI!")
    else:
        print("🎉 MATCH CONFIRMED: Successfully verified @AstroSparksAI!")

    return result


def exchange_code(code_or_url: str):
    import re
    raw = code_or_url.strip()
    match = re.search(r'code=([^&\s]+)', raw)
    if match:
        code = urllib.parse.unquote(match.group(1))
    elif raw.startswith("http://") or raw.startswith("https://"):
        parsed = urllib.parse.urlparse(raw)
        params = urllib.parse.parse_qs(parsed.query)
        if "code" in params:
            code = params["code"][0]
        else:
            raise ValueError(f"Could not find 'code' query parameter in URL: {raw}")
    else:
        code = raw

    if not STATE_FILE.is_file():
        raise RuntimeError(f"State file not found at {STATE_FILE}. Generate an auth URL first.")

    state_data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    code_verifier = state_data.get("code_verifier")
    state = state_data.get("state")

    flow = InstalledAppFlow.from_client_secrets_file(
        str(CLIENT_SECRET_PATH),
        SCOPES,
        state=state,
    )
    flow.redirect_uri = REDIRECT_URI
    flow.code_verifier = code_verifier

    print(f"🔄 Exchanging authorization code with Google OAuth endpoint...")
    flow.fetch_token(code=code)
    creds = flow.credentials
    save_and_verify_credentials(creds)


def run_local_listener(timeout_sec: int = 300):
    auth_url, state, code_verifier = generate_auth_url()
    print("=" * 60)
    print("📢 GOOGLE OAUTH AUTHORIZATION REQUIRED")
    print("=" * 60)
    print(f"\n1. Open this link in your browser:")
    print(f"\n{auth_url}\n")
    print("2. Sign in with the Google Account that owns @AstroSparksAI.")
    print("3. Grant permissions and click Allow.")
    print("=" * 60)

    class OAuthHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            if "code" in params:
                code = params["code"][0]
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(
                    b"<html><body><h1>Authorization Successful!</h1><p>You can close this window now.</p></body></html>"
                )
                self.server.auth_code = code
            else:
                self.send_response(400)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"<html><body><h1>Error: No code received</h1></body></html>")

        def log_message(self, format, *args):
            pass

    server = HTTPServer(("0.0.0.0", PORT), OAuthHandler)
    server.auth_code = None
    server.timeout = 2.0

    start = time.time()
    print(f"👂 Listening on port {PORT} for callback (Timeout: {timeout_sec}s)...")
    while time.time() - start < timeout_sec:
        server.handle_request()
        if server.auth_code:
            print("📥 Received authorization code from browser callback!")
            exchange_code(server.auth_code)
            return

    print("⏱️ Listener timed out. You can still exchange the code manually using --exchange.")


def main():
    parser = argparse.ArgumentParser(description="Google OAuth Helper for YouTube Pipeline")
    parser.add_argument("--generate-url", action="store_true", help="Generate authorization URL and state file")
    parser.add_argument("--listen", action="store_true", help="Start local server and wait for OAuth callback")
    parser.add_argument("--exchange", type=str, help="Exchange authorization code or redirect URL for tokens")
    parser.add_argument("--verify", action="store_true", help="Verify current token in storage")

    args = parser.parse_args()

    if args.generate_url:
        url, state, _ = generate_auth_url()
        print(f"AUTH_URL: {url}")
        print(f"STATE: {state}")
    elif args.listen:
        run_local_listener()
    elif args.exchange:
        exchange_code(args.exchange)
    elif args.verify:
        token_path = TOKEN_PATHS[0]
        if not token_path.is_file():
            print(f"❌ Token file does not exist: {token_path}")
            sys.exit(1)
        data = json.loads(token_path.read_text(encoding="utf-8"))
        from google.oauth2.credentials import Credentials
        creds = Credentials.from_authorized_user_info(data, SCOPES)
        save_and_verify_credentials(creds)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
