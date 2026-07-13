$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  User Server  ->  http://localhost:5180" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$dir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $dir) { $dir = $PSScriptRoot }
if (-not $dir) { $dir = "C:\excel-to-sms-sender" }

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Set-Location $dir
npm run dev -- --host 127.0.0.1 --strictPort
