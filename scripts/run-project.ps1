# Build frontend (for nginx), then start all containers.
# Run from project root: .\scripts\run-project.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

Set-Location $root

# Build frontend if needed (nginx serves frontend/build)
if (-not (Test-Path "frontend\build\index.html")) {
    Write-Host "Building frontend (first run or after changes)..." -ForegroundColor Cyan
    Set-Location frontend
    npm ci 2>$null; if ($LASTEXITCODE -ne 0) { npm install }
    npm run build
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Set-Location $root
} else {
    Write-Host "Frontend build found. Skip with FRESH=1 to force rebuild." -ForegroundColor Gray
}

# Start core stack + VMs (full project)
Write-Host "Starting Docker stack (nginx, backend, mongo, test-runner, VMs)..." -ForegroundColor Cyan
docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker compose failed. Try: docker compose -f docker-compose.yml up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Containers started. Seed the database:" -ForegroundColor Green
Write-Host "  docker compose exec backend npm run seed" -ForegroundColor White
Write-Host "  docker compose exec backend npm run seed:admin" -ForegroundColor White
Write-Host ""
Write-Host "App: http://localhost (nginx) or http://localhost:5000 (backend)" -ForegroundColor Green
