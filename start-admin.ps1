$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Admin Server ->  http://localhost:5181" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$dir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $dir) { $dir = $PSScriptRoot }
if (-not $dir) { $dir = "C:\excel-to-sms-sender" }

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Set-Location $dir
npm run dev:admin -- --host 127.0.0.1 --strictPort
