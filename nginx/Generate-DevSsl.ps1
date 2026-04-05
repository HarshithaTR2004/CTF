#Requires -Version 5.1
<#
  Creates self-signed TLS certs for local/LAN HTTPS (nginx on 443).
  Re-run after your LAN IP changes if browsers warn about certificate mismatch.

  Prerequisites: Docker running.
  Run from this folder (nginx):
    .\Generate-DevSsl.ps1
    .\Generate-DevSsl.ps1 -LanIp 192.168.1.50   # extra SAN (optional, repeat for more)

  Then from repo root:
    docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d --force-recreate nginx
#>
param(
  [string[]]$LanIp = @()
)

$ErrorActionPreference = "Stop"
$SslDir = Join-Path $PSScriptRoot "ssl"
New-Item -ItemType Directory -Force -Path $SslDir | Out-Null

$autoIps = @()
try {
  $autoIps = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } |
    ForEach-Object { $_.IPAddress })
} catch { }

$allIps = @("127.0.0.1") + ($autoIps | Select-Object -Unique) + $LanIp | Select-Object -Unique

$alt = New-Object System.Collections.Generic.List[string]
$dnsIdx = 1
[void]$alt.Add("DNS.$dnsIdx = localhost"); $dnsIdx++
[void]$alt.Add("DNS.$dnsIdx = ctf-cyberrangex.local"); $dnsIdx++

$ipIdx = 1
foreach ($ip in $allIps) {
  if ($ip -match '^[0-9.]+$') {
    [void]$alt.Add("IP.$ipIdx = $ip")
    $ipIdx++
  }
}

$altBlock = ($alt -join "`n")

$opensslCnf = @"
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
req_extensions     = v3_req

[dn]
CN = ctf-cyberrangex.local

[v3_req]
basicConstraints = CA:FALSE
keyUsage         = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName   = @alt_names

[alt_names]
$altBlock
"@

$tmpCnf = Join-Path $env:TEMP ("ctf-openssl-{0}.cnf" -f [Guid]::NewGuid().ToString("n"))
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tmpCnf, $opensslCnf, $utf8NoBom)

try {
  Write-Host "Generating server.crt / server.key in ssl\ ..." -ForegroundColor Cyan
  Write-Host "SAN entries:`n$altBlock`n" -ForegroundColor DarkGray

  docker run --rm `
    -v "${SslDir}:/out" `
    -v "${tmpCnf}:/openssl.cnf:ro" `
    alpine:3.20 `
    sh -c "apk add --no-cache openssl >/dev/null && openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -keyout /out/server.key -out /out/server.crt -config /openssl.cnf -extensions v3_req"

  if ($LASTEXITCODE -ne 0) { throw "openssl in container failed (exit $LASTEXITCODE)" }

  Write-Host "Done. Restart nginx if it is already running:" -ForegroundColor Green
  Write-Host "  docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d --force-recreate nginx" -ForegroundColor White
} finally {
  Remove-Item -LiteralPath $tmpCnf -Force -ErrorAction SilentlyContinue
}
