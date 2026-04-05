@ECHO OFF
SETLOCAL
TITLE Fix Docker Desktop - Virtualization

:: Self-elevate to Administrator (required to enable Windows features)
NET session >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO Requesting Administrator rights... Please approve the UAC prompt.
    PowerShell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    EXIT /B
)

ECHO.
ECHO ========================================
ECHO  Docker Desktop - Virtualization Fix
ECHO ========================================
ECHO.

:: 1. Enable Virtual Machine Platform (required for WSL2 and Docker)
ECHO [1/4] Enabling Virtual Machine Platform...
DISM.exe /Online /Enable-Feature /FeatureName:VirtualMachinePlatform /All /NoRestart
IF %ERRORLEVEL% EQU 0 (ECHO     Done.) ELSE IF %ERRORLEVEL% EQU 3010 (ECHO     Done. Restart required.) ELSE (ECHO     Warning: DISM returned %ERRORLEVEL% - if you saw "completed successfully" above, continue.)
ECHO.

:: 2. Enable Windows Subsystem for Linux
ECHO [2/4] Enabling Windows Subsystem for Linux...
DISM.exe /Online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All /NoRestart
IF %ERRORLEVEL% EQU 0 (ECHO     Done.) ELSE IF %ERRORLEVEL% EQU 3010 (ECHO     Done. Restart required.) ELSE (ECHO     Warning: DISM returned %ERRORLEVEL% - if you saw "completed successfully" above, continue.)
ECHO.

:: 3. Update WSL and set default to v2
ECHO [3/4] Updating WSL...
wsl --update
ECHO.
ECHO [4/4] Setting WSL default version to 2...
wsl --set-default-version 2
ECHO.

ECHO ========================================
ECHO  RESTART REQUIRED
ECHO ========================================
ECHO.
ECHO Windows features were enabled. You MUST restart this PC for them to take effect.
ECHO After restart, start Docker Desktop again.
ECHO.
SET /P RESTART="Restart now? (Y/N): "
IF /I "%RESTART%"=="Y" (
    ECHO Restarting in 15 seconds... Press Ctrl+C to cancel.
    timeout /t 15
    shutdown /r /t 0
) ELSE (
    ECHO Please restart your PC manually, then start Docker Desktop.
)
ECHO.
PAUSE
