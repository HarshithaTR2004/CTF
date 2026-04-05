# PowerShell script to verify setup
Write-Host "Verifying CyberRangeX Setup..." -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check MongoDB connection
Write-Host "1. Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoTest = node -e "require('mongoose').connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberrangex').then(() => { console.log('✅ MongoDB Connected'); process.exit(0); }).catch((e) => { console.log('❌ MongoDB Error:', e.message); process.exit(1); });"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ MongoDB is accessible`n" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MongoDB connection failed`n" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Could not test MongoDB connection`n" -ForegroundColor Red
}

# Check if challenges exist
Write-Host "2. Checking challenges in database..." -ForegroundColor Yellow
$challengeCheck = node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const Challenge = require('./models/Challenge');
(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberrangex');
        const count = await Challenge.countDocuments();
        console.log('Found', count, 'challenges');
        if (count === 24) {
            console.log('✅ All 24 challenges found');
        } else if (count > 0) {
            console.log('⚠️  Only', count, 'challenges found (expected 24)');
        } else {
            console.log('❌ No challenges found. Run: npm run seed');
        }
        process.exit(0);
    } catch (e) {
        console.log('❌ Error:', e.message);
        process.exit(1);
    }
})();
"

# Check if lab files exist
Write-Host "`n3. Checking lab files..." -ForegroundColor Yellow
$labFiles = Get-ChildItem -Path "lab" -Filter "*.js" | Measure-Object
if ($labFiles.Count -eq 24) {
    Write-Host "   ✅ All 24 lab files found`n" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Found $($labFiles.Count) lab files (expected 24)`n" -ForegroundColor Yellow
}

# Summary
Write-Host "================================`n" -ForegroundColor Cyan
Write-Host "Setup Verification Complete!" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. If no challenges found, run: npm run seed" -ForegroundColor White
Write-Host "2. Start backend: npm run dev" -ForegroundColor White
Write-Host "3. Start frontend: cd ../frontend && npm start" -ForegroundColor White

