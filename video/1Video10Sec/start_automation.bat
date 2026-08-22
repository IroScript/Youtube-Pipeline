@echo off
title 10Sec Single Video Automation Pipeline - Chrome Profile 5
cd /d "%~dp0"
echo =======================================================================
echo  Starting Full Automation (No Human Touch) for 10-Sec Video Generation
echo =======================================================================

set VENV_PY=C:\Users\Irak\Desktop\Youtube Pipeline\PromptDatabase\.venv\Scripts\python.exe
if exist "%VENV_PY%" (
    "%VENV_PY%" run_single_video_pipeline.py
) else (
    python run_single_video_pipeline.py
)
pause
