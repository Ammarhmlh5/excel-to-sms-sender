$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
if (-not $scriptDir) { $scriptDir = "C:\excel-to-sms-sender" }

Set-Location $scriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  excel-to-sms-sender" -ForegroundColor Cyan
Write-Host "  Launching development servers..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "$scriptDir\package.json")) {
    throw "Project files were not found in $scriptDir"
}

if (-not (Test-Path "$scriptDir\node_modules")) {
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
}

function Test-ServerReady {
    param(
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Test-PortInUse {
    param([int]$Port)

    try {
        $tcpListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $tcpListener.Start()
        $tcpListener.Stop()
        return $false
    } catch {
        return $true
    }
}

function Start-DevWindow {
    param(
        [string]$Title,
        [string]$Url,
        [string]$Command,
        [string]$Color
    )

    if (Test-ServerReady -Url $Url) {
        Write-Host "  [OK] $Title -> $Url" -ForegroundColor $Color
        return
    }

    $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-Command', "Set-Location '$scriptDir'; Write-Host '=== $Title ==='; $Command")

    Start-Process powershell -ArgumentList $arguments -WindowStyle Normal -WorkingDirectory $scriptDir

    for ($attempt = 1; $attempt -le 30; $attempt++) {
        if (Test-ServerReady -Url $Url) {
            Write-Host "  [OK] $Title -> $Url" -ForegroundColor $Color
            return
        }

        Start-Sleep -Seconds 1
    }

    Write-Host "  [..] $Title -> $Url" -ForegroundColor Yellow
}

Start-DevWindow -Title "User" -Url "http://localhost:5180/auth" -Command "npm run dev -- --host 127.0.0.1 --strictPort" -Color Green
Start-DevWindow -Title "Admin" -Url "http://localhost:5181/" -Command "npm run dev:admin -- --host 127.0.0.1 --strictPort" -Color Magenta

Write-Host ""
Write-Host "  User:  http://localhost:5180/auth" -ForegroundColor Green
Write-Host "  Admin: http://localhost:5181/" -ForegroundColor Magenta
Write-Host "  Close the two terminal windows or run stop-dev.ps1 to stop them." -ForegroundColor DarkGray
Write-Host ""
