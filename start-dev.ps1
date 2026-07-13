$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  excel-to-sms-sender" -ForegroundColor Cyan
Write-Host "  Starting both servers..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  User:  http://localhost:5180/auth" -ForegroundColor Green
Write-Host "  Admin: http://localhost:5181/" -ForegroundColor Magenta
Write-Host "  Close windows or run stop-dev.ps1 to stop" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill existing
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Resolve project directory
$dir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $dir) { $dir = $PSScriptRoot }
if (-not $dir) { $dir = "C:\excel-to-sms-sender" }

# Start user server
Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$dir'; npm run dev -- --host 127.0.0.1 --strictPort"

Start-Sleep -Seconds 5

# Start admin server
Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$dir'; npm run dev:admin -- --host 127.0.0.1 --strictPort"

Start-Sleep -Seconds 8

# Verify
$userOk = $false
$adminOk = $false
try { $r = Invoke-WebRequest -Uri "http://localhost:5180/auth" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; if ($r.StatusCode -eq 200) { $userOk = $true } } catch {}
try { $r = Invoke-WebRequest -Uri "http://localhost:5181/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; if ($r.StatusCode -eq 200) { $adminOk = $true } } catch {}

Write-Host ""
if ($userOk) { Write-Host "  [OK] User  -> http://localhost:5180/auth" -ForegroundColor Green } else { Write-Host "  [..] User  -> http://localhost:5180/auth" -ForegroundColor Yellow }
if ($adminOk) { Write-Host "  [OK] Admin -> http://localhost:5181/" -ForegroundColor Magenta } else { Write-Host "  [..] Admin -> http://localhost:5181/" -ForegroundColor Yellow }
Write-Host ""
