@ECHO OFF
REM Run the full project (build frontend + start Docker stack). No PowerShell execution policy required.
PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-project.ps1"
PAUSE
