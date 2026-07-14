$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
if (-not $scriptDir) { $scriptDir = 'C:\excel-to-sms-sender' }
Set-Location $scriptDir

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Backend Server' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path "$scriptDir\package.json")) {
    throw "Project files were not found in $scriptDir"
}

if (-not (Test-Path "$scriptDir\node_modules")) {
    Write-Host 'Installing dependencies...' -ForegroundColor Yellow
    npm install
}

$arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-Command', "Set-Location '$scriptDir'; Write-Host '=== Backend ==='; npm run dev")
Start-Process powershell -ArgumentList $arguments -WindowStyle Normal -WorkingDirectory $scriptDir
Write-Host '[OK] Backend launcher started.' -ForegroundColor Green
