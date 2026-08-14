@echo off
title 10Sec Single Video Automation Pipeline - Chrome Profile 5
cd /d "%~dp0"
echo =======================================================================
echo  Starting Full Automation (No Human Touch) for 10-Sec Video Generation
echo =======================================================================
python run_single_video_pipeline.py
pause
