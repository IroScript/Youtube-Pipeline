@echo off
setlocal
cd /d "%~dp0"
echo ============================================================================
echo   MASTER CSV EXPORT GENERATOR (AUTONOMOUS TIMESTAMPED EXPORT)
echo ============================================================================
echo.
.venv\Scripts\python.exe generate_all_csvs.py %*
echo.
pause
