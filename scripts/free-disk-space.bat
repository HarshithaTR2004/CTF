@ECHO OFF
REM Free disk space so Docker can run. Close Docker Desktop first.
PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0free-disk-space.ps1"
