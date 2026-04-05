#Requires -Version 5.1
<#
  Avoid cert.pem / "tunnel login" issues: use a REMOTE-MANAGED tunnel token from Cloudflare.

  1) Open: https://one.dash.cloudflare.com/
  2) Networks -> Connectors -> Cloudflare Tunnels -> Create tunnel (choose a name).
  3) Under "Install connector", copy the LONG token (starts with eyJ).
  4) In Public Hostname tab, add a route:
       Subdomain: e.g. ctf
       Domain: cyberrangex.com (must be Active on Cloudflare)
       Service type: HTTP
       URL: http://127.0.0.1:80
  5) Run THIS script and paste the token. It saves cloudflare-tunnel\tunnel.token (gitignored).

  Then from repo root:
    .\Start-Hosting.ps1

  Still need outbound port 7844 (or hotspot). Run .\Diagnose-Cloudflare.ps1 to test.
#>
$ErrorActionPreference = "Stop"
$TunnelDir = $PSScriptRoot
$OutFile = Join-Path $TunnelDir "tunnel.token"

Write-Host ""
Write-Host "Paste the tunnel token from Cloudflare (one line, usually starts with eyJ)." -ForegroundColor Cyan
Write-Host "Right-click to paste in PowerShell, then press Enter.`n" -ForegroundColor DarkGray
$token = Read-Host "Token"

$token = $token.Trim()
if ($token.Length -lt 50) {
  Write-Host "That does not look like a full token. Copy the entire string from Cloudflare." -ForegroundColor Red
  exit 1
}

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutFile, $token, $utf8)
Write-Host ""
Write-Host "Saved: $OutFile" -ForegroundColor Green
Write-Host "Do not share this file. It is listed in .gitignore." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "  cd `"$(Split-Path $TunnelDir -Parent)`"" -ForegroundColor White
Write-Host "  .\Start-Hosting.ps1" -ForegroundColor White
Write-Host ""
