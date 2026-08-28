@echo off
title Master Unified Pipeline Runner (Prompt + SEO + CSVs)
cd /d "%~dp0PromptDatabase"

set PYTHONUNBUFFERED=1
set PY_EXE=.venv\Scripts\python.exe

if not exist "%PY_EXE%" (
    set PY_EXE=python
)

if not "%~1"=="" (
    "%PY_EXE%" -u run_prompt_and_seo_fillup.py %*
    goto end
)

:menu
cls
echo ======================================================================
echo       🚀 MASTER UNIFIED PIPELINE RUNNER (PROMPT + SEO + CSVS)
echo ======================================================================
echo.
echo   [1] Full Auto Fillup (Prompt Escalation + Real SEO + All CSVs Sync)
echo   [2] Backfill SEO Only (Harvest Real Keywords + Description + Tags)
echo   [3] Fast Keyless SEO + Offline Escalation Fillup (--no-browser)
echo   [4] Refresh All Master CSV Exports (Exports master prompts, SEO, tasks)
echo   [5] Check Live Stage-Gate Status & Progress Plan
echo   [6] ChatGPT One-Time Browser Login (Persistent Profile Sign-In)
echo   [0] Exit
echo.
echo ======================================================================
set /p choice="Select an option (0-6) [default: 1]: "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto full_auto
if "%choice%"=="2" goto seo_only
if "%choice%"=="3" goto no_browser
if "%choice%"=="4" goto refresh_csv
if "%choice%"=="5" goto check_status
if "%choice%"=="6" goto chatgpt_login
if "%choice%"=="0" goto end

echo Invalid option selected.
timeout /t 2 >nul
goto menu

:full_auto
cls
echo Starting Full Auto Pipeline Fillup...
echo.
"%PY_EXE%" -u run_prompt_and_seo_fillup.py
goto finish

:seo_only
cls
echo Backfilling Real SEO for All Pending Ideas...
echo.
"%PY_EXE%" -u run_prompt_and_seo_fillup.py --seo-only
goto finish

:no_browser
cls
echo Running Fast Keyless / Deterministic Fillup...
echo.
"%PY_EXE%" -u run_prompt_and_seo_fillup.py --no-browser
goto finish

:refresh_csv
cls
echo Refreshing All Master CSV Exports...
echo.
"%PY_EXE%" -u run_prompt_and_seo_fillup.py --export-only
goto finish

:check_status
cls
echo Checking Live Stage-Gate Status...
echo.
"%PY_EXE%" -u run_stage_pipeline.py --status
echo.
"%PY_EXE%" -u run_stage_pipeline.py --plan
goto finish

:chatgpt_login
cls
echo Opening Persistent Chrome Profile for One-Time ChatGPT Login...
echo.
"%PY_EXE%" -u prompt_chain_engine.py --login
goto finish

:finish
echo.
echo ======================================================================
echo Process Finished! Press any key to return to menu...
echo ======================================================================
pause >nul
goto menu

:end
echo.
echo Goodbye!
pause
