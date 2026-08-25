@echo off
title Keyless YouTube SEO Engine (CloakBrowser + Keyless Data Sources)
cd /d "%~dp0"
echo ======================================================================
echo        KEYLESS YOUTUBE SEO ENGINE  (No LLM API key, No YouTube API key)
echo ======================================================================
echo.

set PYTHONUNBUFFERED=1

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -u run_seo.py %*
) else (
    python -u run_seo.py %*
)

echo.
pause
