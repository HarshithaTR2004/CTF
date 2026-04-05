# PowerShell script to seed the database
Write-Host "Starting database seeding..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Run seed script
Write-Host "Seeding database with 24 challenges..." -ForegroundColor Cyan
npm run seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Database seeded successfully!" -ForegroundColor Green
    Write-Host "All 24 challenges should now be available." -ForegroundColor Green
} else {
    Write-Host "`n❌ Error seeding database. Check MongoDB connection." -ForegroundColor Red
    Write-Host "Make sure MongoDB is running and MONGO_URI is correct in .env file." -ForegroundColor Yellow
}

