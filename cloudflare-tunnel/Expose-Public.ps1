#Requires -Version 5.1
<#
  When Cloudflare Tunnel fails (port 7844 blocked), this tries other ways to get a public URL.

  Prereq: Docker app running on port 80 (nginx). Test: http://127.0.0.1/health

  Usage (from this folder):
    .\Expose-Public.ps1              # prefers localtunnel via npx
    .\Expose-Public.ps1 -UseNgrok      # run "ngrok http 80" if ngrok is installed

  localtunnel: needs Node.js (https://nodejs.org). First run may download packages.
  ngrok: install from https://ngrok.com/download then: ngrok config add-authtoken <token>
#>
param(
  [switch]$UseNgrok
)

$ErrorActionPreference = "Continue"

try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1/health" -UseBasicParsing -TimeoutSec 5
  if ($r.StatusCode -ne 200) { throw "bad status" }
} catch {
  Write-Host "Nothing healthy on http://127.0.0.1:80. Start Docker first from repo root:" -ForegroundColor Red
  Write-Host '  docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d' -ForegroundColor Yellow
  exit 1
}

if ($UseNgrok) {
  $ng = Get-Command ngrok -ErrorAction SilentlyContinue
  if (-not $ng) {
    Write-Host "ngrok not found in PATH. Install: https://ngrok.com/download" -ForegroundColor Red
    Write-Host "Then: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Yellow
    exit 1
  }
  Write-Host "Starting ngrok on port 80... Share the https URL it prints. Ctrl+C to stop.`n" -ForegroundColor Cyan
  & ngrok http 80
  exit $LASTEXITCODE
}

$node = Get-Command node -ErrorAction SilentlyContinue
$npx = Get-Command npx -ErrorAction SilentlyContinue
if ($node -and $npx) {
  Write-Host @"

localtunnel (npx) - READ THIS
  * Leave THIS PowerShell window OPEN the whole time others use the URL.
    If you close it, the site shows: 503 - Tunnel Unavailable.

  * Open the printed https://....loca.lt URL only AFTER you see "your url is:" below.

  * If you still get 503: run Start-App.ps1 again, wait for /health OK, then run this script again.

  * More reliable: .\Expose-Public.ps1 -UseNgrok  (install ngrok + authtoken).

"@ -ForegroundColor Yellow
  Write-Host "Starting localtunnel on 127.0.0.1:80 ...`n" -ForegroundColor Cyan
  # --local-host 127.0.0.1 avoids Windows resolving "localhost" to IPv6 when Docker only listens on IPv4
  & npx --yes localtunnel --port 80 --local-host 127.0.0.1
  exit $LASTEXITCODE
}

Write-Host @"

No Node.js (npx) and not using -UseNgrok.

Pick one:

  A) Install Node.js LTS from https://nodejs.org  then run again:
       .\Expose-Public.ps1

  B) Install ngrok from https://ngrok.com/download  add authtoken, then:
       .\Expose-Public.ps1 -UseNgrok

  C) Same room only: use LAN (no internet tunnel):
       .\Access-LAN.ps1
     Open http://<your-PC-IP>:80/ on other devices (HTTPS optional; browser will warn on self-signed).

  D) Cloudflare: only works if outbound port 7844 is allowed (try phone hotspot), then:
       .\Setup-Tunnel.ps1 -Quick

"@ -ForegroundColor Yellow
exit 1
