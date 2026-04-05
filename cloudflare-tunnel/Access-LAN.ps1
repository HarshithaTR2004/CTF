#Requires -Version 5.1
<#
  Use the CTF app from phones/tablets/PCs on the SAME Wi-Fi/LAN as this machine.

  Cloudflare Quick Tunnel needs outbound TCP/UDP 7844; many school/office networks block it.
  LAN access needs this PC's IPv4 and (often) Windows Firewall rules for ports 80 and 443.

  Run from this folder:
    .\Access-LAN.ps1
    .\Access-LAN.ps1 -AddFirewallRule   # TCP 80 + 443 inbound (asks for Administrator)

  HTTPS: from repo, run once  nginx\Generate-DevSsl.ps1  then recreate nginx.

  On the other device: prefer  https://<IP>/  (self-signed: tap Advanced -> Continue).
#>
param(
  [switch]$AddFirewallRule
)

$RuleName80 = "CTF-Cyberrangex - HTTP 80 (Docker nginx)"
$RuleName443 = "CTF-Cyberrangex - HTTPS 443 (Docker nginx)"

function Test-IsAdministrator {
  return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Add-InboundPortRule {
  param([string]$DisplayName, [int]$Port)
  $existing = Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Firewall rule already exists: $DisplayName" -ForegroundColor Green
    return
  }
  New-NetFirewallRule -DisplayName $DisplayName -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Profile Any |
    Out-Null
  Write-Host "Added inbound rule: $DisplayName" -ForegroundColor Green
}

function Add-LanFirewallRulesCore {
  Add-InboundPortRule -DisplayName $RuleName80 -Port 80
  Add-InboundPortRule -DisplayName $RuleName443 -Port 443
}

if ($AddFirewallRule) {
  if (-not (Test-IsAdministrator)) {
    Write-Host "Elevating to add Windows Firewall rules for TCP 80 and 443..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$scriptPath`"", "-AddFirewallRule"
    ) | Out-Null
  } else {
    Add-LanFirewallRulesCore
  }
}

Write-Host ""
Write-Host "=== LAN access (same Wi-Fi / Ethernet as this PC) ===" -ForegroundColor Cyan
Write-Host ""

$listen80 = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
$listen443 = Get-NetTCPConnection -LocalPort 443 -State Listen -ErrorAction SilentlyContinue
if (-not $listen80) {
  Write-Host "Nothing is listening on port 80 on this PC yet." -ForegroundColor Yellow
  Write-Host "Start the stack from the repo root, for example:" -ForegroundColor Yellow
  Write-Host "  docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d" -ForegroundColor White
  Write-Host ""
} else {
  Write-Host "Port 80 is in use (Docker/nginx is likely up)." -ForegroundColor Green
  Write-Host ""
}
if (-not $listen443) {
  Write-Host "Port 443 is not listening yet. For HTTPS, create certs then recreate nginx:" -ForegroundColor Yellow
  Write-Host "  cd ..\nginx" -ForegroundColor White
  Write-Host "  .\Generate-DevSsl.ps1" -ForegroundColor White
  Write-Host "  cd .." -ForegroundColor White
  Write-Host "  docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d --force-recreate nginx" -ForegroundColor White
  Write-Host ""
} else {
  Write-Host "Port 443 is in use (HTTPS is available)." -ForegroundColor Green
  Write-Host ""
}

$sslCert = Join-Path $PSScriptRoot "..\nginx\ssl\server.crt"
if (-not (Test-Path $sslCert)) {
  Write-Host "No nginx\ssl\server.crt yet - HTTPS will not work until you run nginx\Generate-DevSsl.ps1" -ForegroundColor Yellow
  Write-Host ""
}

$addrs = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } |
  Sort-Object InterfaceAlias

if (-not $addrs) {
  Write-Host "No suitable IPv4 addresses found." -ForegroundColor Red
  exit 1
}

Write-Host "On another device, use HTTPS (recommended):" -ForegroundColor White
foreach ($a in $addrs) {
  Write-Host ("  https://{0}/" -f $a.IPAddress) -ForegroundColor Green
  Write-Host ("      (interface: {0})  - browser will warn: self-signed dev cert; use Advanced -> continue" -f $a.InterfaceAlias) -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "HTTP (same app, no TLS):" -ForegroundColor White
foreach ($a in $addrs) {
  Write-Host ("  http://{0}/" -f $a.IPAddress) -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "If the page does not load:" -ForegroundColor White
Write-Host "  - Confirm both devices are on the same network." -ForegroundColor DarkGray
Write-Host "  - Run:  .\Access-LAN.ps1 -AddFirewallRule  (allows inbound TCP 80 and 443)" -ForegroundColor DarkGray
Write-Host "  - Corporate guest Wi-Fi often blocks device-to-device traffic; use a personal hotspot." -ForegroundColor DarkGray
Write-Host ""
Write-Host "To share over the Internet when port 7844 is blocked, use another tunnel (e.g. ngrok on 443) or deploy to a host with a public IP." -ForegroundColor DarkGray
Write-Host ""
