$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
if (-not $scriptDir) { $scriptDir = "C:\excel-to-sms-sender" }

Set-Location $scriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Admin Server" -ForegroundColor Magenta
Write-Host "  http://localhost:5181/" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

if (-not (Test-Path "$scriptDir\package.json")) {
    throw "Project files were not found in $scriptDir"
}

function Test-ServerReady {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

if (Test-ServerReady -Url "http://localhost:5181/") {
    Write-Host "[OK] Admin server is already running at http://localhost:5181/" -ForegroundColor Magenta
    return
}

$arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-Command', "Set-Location '$scriptDir'; Write-Host '=== Admin Server ==='; npm run dev:admin -- --host 127.0.0.1 --strictPort")
Start-Process powershell -ArgumentList $arguments -WindowStyle Normal -WorkingDirectory $scriptDir

for ($attempt = 1; $attempt -le 30; $attempt++) {
    if (Test-ServerReady -Url "http://localhost:5181/") {
        Write-Host "[OK] Admin server is ready at http://localhost:5181/" -ForegroundColor Magenta
        break
    }

    Start-Sleep -Seconds 1
}

if (-not (Test-ServerReady -Url "http://localhost:5181/")) {
    Write-Host "[..] Admin server is starting; open the new terminal window to follow the logs." -ForegroundColor Yellow
}
