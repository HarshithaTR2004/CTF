# Free Disk Space (Docker "not enough space" fix)

Docker Desktop failed because **C: has very little free space** (~2 GB). Free at least **5–10 GB** for Docker and Windows to run reliably.

---

## Quick cleanups (run in PowerShell as Administrator)

### 1. Windows Temp and caches
```powershell
Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item C:\Windows\Temp\* -Recurse -Force -ErrorAction SilentlyContinue
```

### 2. Docker Desktop logs (frees space and can fix the error)
```powershell
# Quit Docker Desktop first, then:
Remove-Item "C:\Users\Administrator\AppData\Local\Docker\log\*" -Recurse -Force -ErrorAction SilentlyContinue
```

### 3. npm cache (often 500 MB–2 GB)
```powershell
npm cache clean --force
```

### 4. Windows Delivery Optimization / update cache
```powershell
# Requires Admin
Stop-Service -Name "DoSvc" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Windows\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
Start-Service -Name "DoSvc" -ErrorAction SilentlyContinue
```

### 5. Empty Recycle Bin
```powershell
Clear-RecycleBin -Force -ErrorAction SilentlyContinue
```

### 6. Docker unused data (after Docker is working again)
```powershell
docker system prune -a --volumes
```
Only run this when you don’t need existing images/containers/volumes.

---

## Check free space

```powershell
Get-PSDrive C
# or
wmic logicaldisk where "DeviceID='C:'" get Size,FreeSpace
```

FreeSpace is in bytes (e.g. 10 GB ≈ 10737418240).

---

## After freeing space

1. Restart the PC (recommended).
2. Start **Docker Desktop** and wait until the engine is running.
3. From the project root run:  
   `docker compose up -d --build`  
   then:  
   `docker compose exec backend npm run seed`  
   `docker compose exec backend npm run seed:admin`
