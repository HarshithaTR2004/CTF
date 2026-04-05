#Requires -Version 5.1
<#
  Checks the three common Cloudflare Tunnel blockers and prints what YOU must fix
  (registrar, network, or cert). Run from cloudflare-tunnel or any folder:

    .\Diagnose-Cloudflare.ps1
    .\Diagnose-Cloudflare.ps1 -Domain cyberrangex.com
#>
param(
  [string]$Domain = "cyberrangex.com"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=== 1) Outbound TCP port 7844 (Cloudflare Tunnel edge) ===" -ForegroundColor Cyan
try {
  $t = Test-NetConnection -ComputerName 198.41.192.7 -Port 7844 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
  if ($t.TcpTestSucceeded) {
    Write-Host "OK: This PC can reach Cloudflare on TCP 7844." -ForegroundColor Green
  } else {
    Write-Host "FAIL: TCP 7844 did not connect (blocked by network, ISP, or security software)." -ForegroundColor Red
    Write-Host "  Fix: Use phone hotspot or home Wi-Fi; turn VPN off; ask IT to allow outbound 7844:" -ForegroundColor Yellow
    Write-Host "  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/" -ForegroundColor White
  }
} catch {
  Write-Host "Could not test 7844: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 2) Domain nameservers (must point to Cloudflare) ===" -ForegroundColor Cyan
Write-Host "Checking public NS for: $Domain" -ForegroundColor DarkGray
try {
  $ns = @(Resolve-DnsName -Name $Domain -Type NS -DnsOnly -ErrorAction SilentlyContinue)
  if (-not $ns -or $ns.Count -eq 0) {
    $ns = @(Resolve-DnsName -Name $Domain -Type NS -ErrorAction SilentlyContinue)
  }
  $list = @()
  foreach ($r in $ns) {
    $h = $r.NameHost
    if (-not $h -and $r.Strings) { $h = [string]$r.Strings }
    if ($h) { $list += $h }
  }
  if (-not $list -or $list.Count -eq 0) {
    Write-Host "Could not read NS records (propagation or lookup issue)." -ForegroundColor Yellow
  } else {
    $list | ForEach-Object { Write-Host "  NS: $_" }
    $cf = $list | Where-Object { $_ -match '\.cloudflare\.com$' }
    if ($cf) {
      Write-Host "OK: At least one Cloudflare nameserver found." -ForegroundColor Green
    } else {
      Write-Host "FAIL: No *.ns.cloudflare.com in public NS yet." -ForegroundColor Red
      Write-Host "  Fix: At your domain REGISTRAR, set nameservers to the two shown in:" -ForegroundColor Yellow
      Write-Host "  Cloudflare dashboard -> $Domain -> DNS (or Overview)." -ForegroundColor White
      Write-Host "  Wait until dashboard shows Active (often 1-24 hours)." -ForegroundColor White
    }
  }
} catch {
  Write-Host "DNS lookup failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 3) cloudflared login certificate (local file) ===" -ForegroundColor Cyan
$cert = Join-Path $env:USERPROFILE ".cloudflared\cert.pem"
if (Test-Path $cert) {
  Write-Host "OK: cert.pem exists: $cert" -ForegroundColor Green
} else {
  Write-Host "MISSING: $cert" -ForegroundColor Yellow
  Write-Host "  Fix A: Run tunnel login and place downloaded cert as cert.pem (see Setup-NamedTunnel.ps1)." -ForegroundColor White
  Write-Host "  Fix B (no cert): use a tunnel TOKEN from the dashboard instead:" -ForegroundColor White
  Write-Host "    .\Setup-TokenTunnel.ps1" -ForegroundColor Cyan
  Write-Host "    then: ..\Start-Hosting.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Optional: tunnel without cert.pem ===" -ForegroundColor DarkCyan
Write-Host "Cloudflare Zero Trust -> Networks -> Connectors -> Cloudflare Tunnels -> Create." -ForegroundColor White
Write-Host "Add a Public Hostname: URL http://127.0.0.1:80 (or localhost:80). Copy install token." -ForegroundColor White
Write-Host "Run: .\Setup-TokenTunnel.ps1   then from repo root: .\Start-Hosting.ps1`n" -ForegroundColor White
