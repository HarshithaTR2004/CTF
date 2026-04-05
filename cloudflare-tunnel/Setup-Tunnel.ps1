#Requires -Version 5.1
<#
  Cloudflare Tunnel ONLY — does NOT start Docker or the app.

  To run the application, from repo root use:
    .\Start-App.ps1

  Then (optional) use this script to get a trycloudflare.com URL, if your network allows port 7844.

  Prereqs:
  - App already running: http://127.0.0.1/health returns healthy (after Start-App.ps1)
  - Domain on Cloudflare (for named hostname). For a quick test URL without DNS, use -Quick only.

  Run in PowerShell (from this folder):
    .\Setup-Tunnel.ps1
    .\Setup-Tunnel.ps1 -Quick
    .\Setup-Tunnel.ps1 -Quick -SkipEdgeCheck
    .\Setup-Tunnel.ps1 -Quick -Protocol quic
    .\Setup-Tunnel.ps1 -Hostname "ctf.yourdomain.com"
#>
param(
  [string]$Hostname = "",
  [switch]$Quick,
  [switch]$DownloadOnly,
  [switch]$SkipHealthCheck,
  [ValidateSet("http2", "quic", "auto")]
  [string]$Protocol = "http2",
  [switch]$SkipEdgeCheck
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$BinDir = Join-Path $Root "bin"
$Exe = Join-Path $BinDir "cloudflared.exe"
$DownloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

function Ensure-Cloudflared {
  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  if (Test-Path $Exe) {
    $len = (Get-Item $Exe).Length
    if ($len -gt 5MB) { return }
    Write-Host "Incomplete cloudflared.exe; re-downloading..." -ForegroundColor Yellow
    Remove-Item $Exe -Force -ErrorAction SilentlyContinue
  }
  Write-Host "Downloading cloudflared..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $Exe -UseBasicParsing
  Write-Host "Installed: $Exe" -ForegroundColor Green
}

function Test-NginxLocal {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1/health" -UseBasicParsing -TimeoutSec 5
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

# cloudflared talks to Cloudflare edge on TCP 7844 (http2) and UDP 7844 (quic) - not HTTPS 443.
# See: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/
function Test-CloudflareEdgeTcp7844 {
  param([string]$ProbeHost = "198.41.192.7")
  try {
    $r = Test-NetConnection -ComputerName $ProbeHost -Port 7844 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    return [bool]$r.TcpTestSucceeded
  } catch {
    return $false
  }
}

Ensure-Cloudflared
if ($DownloadOnly) { exit 0 }

if (-not (Test-NginxLocal)) {
  Write-Host @"

nginx on http://localhost:80 is not responding (/health).
Start Docker first from the repo root, for example:

  docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d

"@ -ForegroundColor Yellow
}

if ($Quick) {
  if (-not $SkipEdgeCheck -and -not (Test-CloudflareEdgeTcp7844)) {
    Write-Host @"

CLOUDFLARE TUNNEL NEEDS OUTBOUND PORT 7844
Your PC cannot open TCP to Cloudflare on port 7844 (tested 198.41.192.7:7844).
Logs like "actively refused" or QUIC timeouts mean your network or PC firewall is
blocking Cloudflare Tunnel. This is NOT fixable by changing http2/quic alone -
both use port 7844 to the edge.

What to do:
  1) Try phone hotspot or another Wi-Fi (campus/corporate networks often block it).
  2) Ask IT to allow outbound TCP and UDP to Cloudflare tunnel IPs on port 7844:
     https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/
  3) Temporarily disable VPN / third-party firewall to test.
  4) Use a different expose tool if 7844 must stay blocked:
       .\Expose-Public.ps1   (localtunnel via Node, or -UseNgrok)

  For phones/laptops on the SAME Wi-Fi as this PC (no Cloudflare needed):
     .\Access-LAN.ps1
     (same folder as this script; use https://<your-PC-IP>:443/ after nginx\Generate-DevSsl.ps1)

To skip this check and run cloudflared anyway:  .\Setup-Tunnel.ps1 -Quick -SkipEdgeCheck

"@ -ForegroundColor Red
    exit 1
  }

  if (-not $SkipHealthCheck -and -not (Test-NginxLocal)) {
    Write-Host @"

QUICK tunnel aborted: nothing is answering at http://127.0.0.1:80/health
Start Docker first (repo root):

  cd `"..`"
  docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d

Then open http://127.0.0.1/health in your browser - the response body should be: healthy
Retry:  .\Setup-Tunnel.ps1 -Quick

To skip this check (not recommended):  .\Setup-Tunnel.ps1 -Quick -SkipHealthCheck

"@ -ForegroundColor Red
    exit 1
  }

  Write-Host @"

================================================================================
  QUICK TUNNEL - read this
================================================================================
  * Edge transport: $Protocol (default http2). http2 uses TCP 7844; quic uses
    UDP 7844. Your network must allow outbound 7844 to Cloudflare - switching
    protocol does not use port 443. If 7844 is blocked, use another network or
    ask IT (link printed if preflight fails). Force QUIC: -Protocol quic

  * The https://....trycloudflare.com link ONLY works while THIS window stays
    open and cloudflared is running. If you close PowerShell or press Ctrl+C,
    the link dies - use a NEW URL next time you run -Quick.

  * Copy the URL from the lines below (look for trycloudflare.com). Do not use
    an old URL from a previous run.

  * Wait until the log shows a successful edge connection (no repeated ERR)
    before opening the URL. If it still fails, try mobile hotspot or another
    network; some firewalls block Cloudflare tunnel ports.

  * Same Wi-Fi only? Run nginx\Generate-DevSsl.ps1, recreate nginx, then .\Access-LAN.ps1
    and open https://<this-PC-IP>:443/ on the other device (or http://...:80/).

================================================================================

"@ -ForegroundColor Yellow
  Write-Host "Tunneling to http://127.0.0.1:80 (nginx), protocol=$Protocol. Press Ctrl+C to stop.`n" -ForegroundColor Cyan
  & $Exe tunnel --protocol $Protocol --url http://127.0.0.1:80
  exit $LASTEXITCODE
}

Write-Host @"

=== Named tunnel (your domain on Cloudflare) ===

1) Log in (browser will open):
     & `"$Exe`" tunnel login

2) Create a tunnel (pick a name, e.g. ctf-cyberrangex):
     & `"$Exe`" tunnel create ctf-cyberrangex

   Note the tunnel UUID and credentials path under:
   $env:USERPROFILE\.cloudflared\

3) Point DNS at the tunnel (replace hostname):
     & `"$Exe`" tunnel route dns ctf-cyberrangex ctf.yourdomain.com

4) Write $Root\config.yml (copy from config.yml.template):
   - tunnel: <UUID>
   - credentials-file: full path to the .json from step 2
   - hostname: same as step 3

5) Run the tunnel:
     & `"$Exe`" tunnel --config `"$Root\config.yml`" run

Optional - install as Windows service (Administrator PowerShell):
     & `"$Exe`" service install
     & `"$Exe`" service start

"@ -ForegroundColor White

if ($Hostname) {
  $TunnelName = "ctf-cyberrangex"
  Write-Host "Running non-interactive helper for hostname: $Hostname" -ForegroundColor Cyan
  Write-Host "If you have not logged in / created the tunnel yet, run the steps above first." -ForegroundColor Yellow
  & $Exe tunnel route dns $TunnelName $Hostname
}

Write-Host "`nOr run: .\Setup-Tunnel.ps1 -Quick   for an instant share link (temporary)." -ForegroundColor Green
