$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
if (-not $scriptDir) { $scriptDir = "C:\excel-to-sms-sender" }

Set-Location $scriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  User Server" -ForegroundColor Green
Write-Host "  http://localhost:5180/auth" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
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

if (Test-ServerReady -Url "http://localhost:5180/auth") {
    Write-Host "[OK] User server is already running at http://localhost:5180/auth" -ForegroundColor Green
    return
}

$arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-Command', "Set-Location '$scriptDir'; Write-Host '=== User Server ==='; npm run dev -- --host 127.0.0.1 --strictPort")
Start-Process powershell -ArgumentList $arguments -WindowStyle Normal -WorkingDirectory $scriptDir

for ($attempt = 1; $attempt -le 30; $attempt++) {
    if (Test-ServerReady -Url "http://localhost:5180/auth") {
        Write-Host "[OK] User server is ready at http://localhost:5180/auth" -ForegroundColor Green
        break
    }

    Start-Sleep -Seconds 1
}

if (-not (Test-ServerReady -Url "http://localhost:5180/auth")) {
    Write-Host "[..] User server is starting; open the new terminal window to follow the logs." -ForegroundColor Yellow
}
