# Fix: Docker Desktop "Virtualization support not detected"

Docker Desktop needs **hardware virtualization** and **Windows virtualization features** (WSL 2 or Hyper-V) to run.

---

## One-click fix (recommended)

1. **Double-click** this file (it will ask for Administrator permission once):
   ```
   scripts\Fix-Docker-Virtualization.bat
   ```
2. Click **Yes** on the UAC prompt.
3. Wait until it finishes (it enables Windows features and updates WSL).
4. **Restart your PC** when prompted (or restart manually).
5. After reboot, start **Docker Desktop** again.

The batch file enables **Virtual Machine Platform** and **Windows Subsystem for Linux**, then updates WSL. A restart is required for the Windows features to take effect.

---

## Step 1: Enable virtualization in BIOS/UEFI (if one-click fix didn’t help)

Docker requires **Intel VT-x** or **AMD-V** to be enabled in firmware.

1. **Restart** your PC.
2. During boot, press the key that opens **BIOS/UEFI** (often `F2`, `F10`, `DEL`, or `ESC` — check your PC/motherboard manual or boot screen).
3. Find a section named **Configuration**, **Advanced**, **CPU Configuration**, or **Security**.
4. Enable:
   - **Intel:** "Intel Virtualization Technology", "VT-x", or "Intel VT-d".
   - **AMD:** "SVM Mode" or "AMD-V".
5. **Save and exit** (often F10).

If you're on a **virtual machine** (e.g. Azure VM, corporate VM), the host must expose virtualization (nested virtualization). Contact your IT admin if you can't change BIOS.

---

## Step 2: Enable Windows features (run as Administrator)

**Right-click PowerShell → "Run as administrator"**, then either:

**Option A – One command (recommended):**

```powershell
wsl --install --no-distribution
```

This enables Virtual Machine Platform and WSL, then **restart your PC** when prompted.

**Option B – Project script:**

```powershell
cd "c:\Users\Administrator\Desktop\CTF-Cyberrangex"
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\scripts\fix-docker-virtualization.ps1
```

**Option C – Manual DISM:**

```powershell
dism.exe /Online /Enable-Feature /FeatureName:VirtualMachinePlatform /All /NoRestart
dism.exe /Online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All /NoRestart
```

Then **restart your PC**.

---

## Step 3: Set WSL 2 as default and update

After reboot, open **PowerShell** (Admin optional for update):

```powershell
wsl --update
wsl --set-default-version 2
```

---

## Step 4: Start Docker Desktop again

1. Start **Docker Desktop**.
2. If it still fails, wait 1–2 minutes after login (so WSL/Hyper-V are fully up), then start Docker again.
3. Optional: [Delay Docker startup](https://github.com/docker/for-win/issues/14910) by 30–60 seconds via Task Scheduler so it starts after WSL is ready.

---

## Quick check: is hardware virtualization on?

In PowerShell:

```powershell
(Get-CimInstance Win32_ComputerSystem).HypervisorPresent
```

- `True` = hypervisor (virtualization) is present and typically usable.
- `False` = either virtualization is off in BIOS, or you're not running with the right Windows features/hypervisor.

---

## System requirements (reference)

- **OS:** Windows 10 22H2+ or Windows 11 (64-bit).
- **WSL 2:** 2.1.5 or later (`wsl --update`).
- **RAM:** 4 GB minimum; 8 GB+ recommended for CTF-Cyberrangex.

[Docker Desktop for Windows — system requirements](https://docs.docker.com/desktop/windows/install/#system-requirements)
