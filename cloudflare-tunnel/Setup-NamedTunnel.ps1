#Requires -Version 5.1
<#
  ONE-TIME: connect your domain on Cloudflare to this PC (stable URL for many laptops).

  Before you run this:
  - Domain added to Cloudflare and using Cloudflare nameservers / DNS.
  - Docker works on this PC (you will run Start-Hosting.ps1 after).

  This script:
  - Ensures cloudflared.exe in .\bin
  - tunnel login (browser) if needed
  - tunnel create + tunnel route dns
  - Writes .\config.yml (points to nginx on http://127.0.0.1:80)

  Your network must allow outbound TCP/UDP 7844 to Cloudflare (try phone hotspot if it fails).

  Run from cloudflare-tunnel folder:
    cd "...\CTF-Cyberrangex\cloudflare-tunnel"
    .\Setup-NamedTunnel.ps1
#>
$ErrorActionPreference = "Stop"

$TunnelDir = $PSScriptRoot
$BinDir = Join-Path $TunnelDir "bin"
$Exe = Join-Path $BinDir "cloudflared.exe"
$ConfigOut = Join-Path $TunnelDir "config.yml"
$DownloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

function Ensure-Cloudflared {
  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  if (Test-Path $Exe) {
    if ((Get-Item $Exe).Length -gt 5MB) { return }
    Remove-Item $Exe -Force -ErrorAction SilentlyContinue
  }
  Write-Host "Downloading cloudflared..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $Exe -UseBasicParsing
  Write-Host "Installed: $Exe" -ForegroundColor Green
}

function Get-TunnelIdFromList {
  param([string]$Name, [string]$CloudflaredExe)
  try {
    $jsonText = & $CloudflaredExe tunnel list --output json 2>&1 | Out-String
    if ($jsonText -match '[\{\[]') {
      $arr = $jsonText | ConvertFrom-Json
      foreach ($t in @($arr)) {
        if ($t.name -eq $Name -and $t.id) { return [string]$t.id }
      }
    }
  } catch { }
  $raw = & $CloudflaredExe tunnel list 2>&1 | Out-String
  foreach ($line in ($raw -split "`r?`n")) {
    if ($line -match '^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s+') {
      $id = $Matches[1]
      $rest = $line.Substring($line.IndexOf($id) + $id.Length).Trim()
      if ($rest -match "^$([regex]::Escape($Name))\b") { return $id }
    }
  }
  return $null
}

function Get-CredentialsPathForTunnel {
  param([string]$TunnelId)
  $p = Join-Path $env:USERPROFILE ".cloudflared\$TunnelId.json"
  if (Test-Path $p) { return $p }
  Get-ChildItem -Path (Join-Path $env:USERPROFILE ".cloudflared") -Filter "*.json" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq "$TunnelId.json" } |
    Select-Object -ExpandProperty FullName -First 1
}

Ensure-Cloudflared

$cfDir = Join-Path $env:USERPROFILE ".cloudflared"
New-Item -ItemType Directory -Force -Path $cfDir | Out-Null

$cert = Join-Path $cfDir "cert.pem"
if (-not (Test-Path $cert)) {
  Write-Host "Logging in to Cloudflare (browser will open). Approve access to your zone.`n" -ForegroundColor Cyan
  Write-Host "If login hangs: use phone hotspot, turn off VPN, or allow cloudflared.exe outbound in firewall.`n" -ForegroundColor DarkGray
  & $Exe tunnel login
  if (-not (Test-Path $cert)) {
    Write-Host ""
    Write-Host "cert.pem is still missing. Cloudflare sometimes downloads the cert instead of saving it." -ForegroundColor Red
    Write-Host @"

Do this:
  1) Open your Downloads folder. Look for a new .pem file (or a file the browser saved after you clicked Authorize).
  2) Copy or move it to (exact path, name cert.pem):
       $cert
     The file should start with a line like: -----BEGIN CERTIFICATE----- or -----BEGIN ARGO TUNNEL TOKEN-----

  3) If there is no file, run login again (try another network / browser):
       & `"$Exe`" tunnel login

  4) Open the cert folder in Explorer:
       explorer.exe `"$cfDir`"

  5) Zone must be Active on Cloudflare (nameservers propagated) for DNS routes later.

Alternative (no cert.pem): Cloudflare Zero Trust dashboard -> Networks -> Tunnels -> Create tunnel,
  install with the token command, then use remote-managed tunnels (different from this script's config.yml flow).

"@ -ForegroundColor Yellow
    exit 1
  }
}

Write-Host ""
Write-Host "=== Named tunnel setup ===" -ForegroundColor Cyan
Write-Host "Use a hostname on a zone in THIS Cloudflare account (e.g. ctf.example.com).`n" -ForegroundColor DarkGray

$tunnelName = Read-Host "Tunnel name [ctf-cyberrangex]"
if ([string]::IsNullOrWhiteSpace($tunnelName)) { $tunnelName = "ctf-cyberrangex" }

$hostname = Read-Host "Public hostname (e.g. ctf.yourdomain.com)"
if ([string]::IsNullOrWhiteSpace($hostname)) {
  Write-Host "Hostname is required." -ForegroundColor Red
  exit 1
}

$hostname = $hostname.Trim().ToLowerInvariant()

Write-Host ""
Write-Host "Creating tunnel (safe if it already exists)..." -ForegroundColor Cyan
$createOut = & $Exe tunnel create $tunnelName 2>&1 | Out-String

$tunnelId = $null
$credPath = $null

if ($createOut -match 'Created tunnel .+ with id ([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})') {
  $tunnelId = $Matches[1]
}
if ($createOut -match '(?i)credentials written to\s+(.+\.json)') {
  $credPath = $Matches[1].Trim()
}

if (-not $tunnelId) {
  $tunnelId = Get-TunnelIdFromList -Name $tunnelName -CloudflaredExe $Exe
}

if (-not $tunnelId) {
  Write-Host "Could not determine tunnel UUID. Output:`n$createOut" -ForegroundColor Red
  Write-Host "Try:  & `"$Exe`" tunnel list" -ForegroundColor Yellow
  exit 1
}

if (-not $credPath) { $credPath = Get-CredentialsPathForTunnel -TunnelId $tunnelId }
if (-not $credPath -or -not (Test-Path $credPath)) {
  Write-Host "Could not find credentials JSON for tunnel $tunnelId under $env:USERPROFILE\.cloudflared\" -ForegroundColor Red
  exit 1
}

$credYaml = $credPath -replace '\\', '/'

Write-Host ""
Write-Host "Routing DNS: $hostname -> tunnel $tunnelName ..." -ForegroundColor Cyan
$routeOut = & $Exe tunnel route dns $tunnelName $hostname 2>&1 | Out-String
Write-Host $routeOut

$yml = @"
# Generated by Setup-NamedTunnel.ps1 - origin is nginx in Docker on this PC
tunnel: $tunnelId
credentials-file: $credYaml
protocol: http2

ingress:
  - hostname: $hostname
    service: http://127.0.0.1:80
  - service: http_status:404
"@

$utf8 = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($ConfigOut, $yml, $utf8)

Write-Host ""
Write-Host "Wrote: $ConfigOut" -ForegroundColor Green
Write-Host ""
Write-Host "Next (every time you host for others):" -ForegroundColor Yellow
Write-Host "  cd `"$(Split-Path $TunnelDir -Parent)`"" -ForegroundColor White
Write-Host "  .\Start-Hosting.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Others open:  https://$hostname/" -ForegroundColor Green
Write-Host "Leave the hosting window open. Port 7844 must be allowed on this network.`n" -ForegroundColor DarkGray
