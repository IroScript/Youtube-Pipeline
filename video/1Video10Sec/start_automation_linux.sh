#!/usr/bin/env bash
# =======================================================================
#  Starting Full Automation (No Human Touch) for 10-Sec Video Generation
#  Linux Environment Adapter — Windows Logic = Source of Truth
# =======================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================="
echo " Starting Full Automation for 10-Sec Video Generation (Linux VM)"
echo " Environment: Linux Adapter + Xvfb Virtual Display (:99)"
echo " Windows Logic = 100% Preserved Source of Truth"
echo "======================================================================="

export DISPLAY="${DISPLAY:-:99}"

# Ensure persistent Xvfb display server is active
if ! systemctl --user is-active --quiet xvfb.service 2>/dev/null; then
    echo "Starting virtual X11 display server (Xvfb :99)..."
    systemctl --user start xvfb.service 2>/dev/null || (Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &)
    sleep 1
fi

VENV_PY="/home/mdkamruzzamanirak_gmail_com/browser_env/bin/python"

if [ -f "$VENV_PY" ]; then
    "$VENV_PY" run_single_video_pipeline_linux.py "$@"
else
    python3 run_single_video_pipeline_linux.py "$@"
fi
