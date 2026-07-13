Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stopping all dev servers..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$stopped = 0

Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Killing node PID $($_.Id)..." -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $stopped++
}

Start-Sleep -Seconds 1
$remaining = (Get-Process node -ErrorAction SilentlyContinue | Measure-Object).Count

if ($stopped -gt 0) {
    Write-Host "[OK] Stopped $stopped process(es). Node remaining: $remaining" -ForegroundColor Green
} else {
    Write-Host "[i] No node processes running." -ForegroundColor DarkGray
}

Write-Host ""
