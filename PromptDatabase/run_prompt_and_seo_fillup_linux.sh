#!/usr/bin/env bash
# =======================================================================
#  Master Unified Pipeline Runner (Prompt + SEO + CSVs) - Linux VM Adapter
#  Windows Logic = Source of Truth. 100% Logic Parity.
# =======================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo "    MASTER UNIFIED PIPELINE RUNNER (PROMPT + SEO + CSVS) [LINUX VM]   "
echo "    Environment: Linux Adapter + Xvfb Virtual Display (:99)           "
echo "    Browser: CloakBrowser / Playwright (ChatGPT Persistent Profile)   "
echo "======================================================================"

export DISPLAY="${DISPLAY:-:99}"
export PYTHONUNBUFFERED=1

# Ensure Xvfb display server is active
if ! systemctl --user is-active --quiet xvfb.service 2>/dev/null; then
    echo "Starting virtual X11 display server (Xvfb :99)..."
    systemctl --user start xvfb.service 2>/dev/null || (Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &)
    sleep 1
fi

VENV_PY="/home/mdkamruzzamanirak_gmail_com/browser_env/bin/python"

if [ -f "$VENV_PY" ]; then
    exec "$VENV_PY" -u run_prompt_and_seo_fillup.py "$@"
else
    exec python3 -u run_prompt_and_seo_fillup.py "$@"
fi
