#Requires -RunAsAdministrator
# Fix Docker Desktop "Virtualization support not detected" on Windows
# Run: PowerShell -ExecutionPolicy Bypass -File .\scripts\fix-docker-virtualization.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Docker Desktop virtualization fix ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check if we're in a position to use virtualization
$hypervisorPresent = (Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction SilentlyContinue).HypervisorPresent
Write-Host "[1] HypervisorPresent: $hypervisorPresent" -ForegroundColor $(if ($hypervisorPresent) { "Green" } else { "Yellow" })
if (-not $hypervisorPresent) {
    Write-Host "    If this stays False after reboot, enable VT-x/AMD-V in BIOS." -ForegroundColor Gray
}
Write-Host ""

# 2. Enable Windows features required for WSL2 / Docker Desktop
Write-Host "[2] Enabling Windows features (Virtual Machine Platform, WSL)..." -ForegroundColor Cyan
try {
    $vmp = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue
    if ($vmp.State -ne "Enabled") {
        Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart | Out-Null
        Write-Host "    VirtualMachinePlatform enabled." -ForegroundColor Green
    } else {
        Write-Host "    VirtualMachinePlatform already enabled." -ForegroundColor Green
    }
} catch {
    Write-Host "    Trying DISM for VirtualMachinePlatform..." -ForegroundColor Yellow
    & dism.exe /Online /Enable-Feature /FeatureName:VirtualMachinePlatform /All /NoRestart
}

try {
    $wsl = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
    if ($wsl.State -ne "Enabled") {
        Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart | Out-Null
        Write-Host "    Microsoft-Windows-Subsystem-Linux enabled." -ForegroundColor Green
    } else {
        Write-Host "    Microsoft-Windows-Subsystem-Linux already enabled." -ForegroundColor Green
    }
} catch {
    Write-Host "    Trying DISM for WSL..." -ForegroundColor Yellow
    & dism.exe /Online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All /NoRestart
}

Write-Host ""
Write-Host "[3] Next steps (after RESTART):" -ForegroundColor Cyan
Write-Host "    1. Restart this PC." -ForegroundColor White
Write-Host "    2. In PowerShell run:  wsl --update" -ForegroundColor White
Write-Host "    3. Then:              wsl --set-default-version 2" -ForegroundColor White
Write-Host "    4. Start Docker Desktop." -ForegroundColor White
Write-Host ""
$restart = Read-Host "Restart now? (y/N)"
if ($restart -eq "y" -or $restart -eq "Y") {
    Write-Host "Restarting in 10 seconds (Ctrl+C to cancel)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    Restart-Computer -Force
} else {
    Write-Host "Please restart manually when ready." -ForegroundColor Yellow
}
