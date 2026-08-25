@echo off
title Prompt/Idea Uniqueness Engine (Diversity + De-duplication)
cd /d "%~dp0"
echo ======================================================================
echo        PROMPT / IDEA UNIQUENESS ENGINE   (dry-run unless --apply)
echo ======================================================================
echo.

set PYTHONUNBUFFERED=1

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -u run_uniqueness.py %*
) else (
    python -u run_uniqueness.py %*
)

echo.
pause
