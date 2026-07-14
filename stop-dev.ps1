Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stopping development servers..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$stopped = 0

Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Killing node PID $($_.Id)..." -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $stopped++
}

Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "excel-to-sms-sender*" } | ForEach-Object {
    Write-Host "  Closing window: $($_.MainWindowTitle)" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1
$remaining = (Get-Process node -ErrorAction SilentlyContinue | Measure-Object).Count

if ($stopped -gt 0 -or $remaining -eq 0) {
    Write-Host "[OK] Development servers stopped." -ForegroundColor Green
} else {
    Write-Host "[i] No matching dev processes were running." -ForegroundColor DarkGray
}

Write-Host ""
