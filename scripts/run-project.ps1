Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ProjectRoot = "C:\excel-to-sms-sender"
$UserPort = 5180
$AdminPort = 5181
$BackendPort = 54321

$form = New-Object System.Windows.Forms.Form
$form.Text = "Excel SMS - Control Panel"
$form.Size = New-Object System.Drawing.Size(440, 470)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Excel SMS Control"
$title.AutoSize = $false
$title.Size = New-Object System.Drawing.Size(410, 40)
$title.Location = New-Object System.Drawing.Point(10, 10)
$title.TextAlign = "MiddleCenter"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::FromArgb(59, 130, 246)
$form.Controls.Add($title)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Status: Stopped"
$statusLabel.AutoSize = $false
$statusLabel.Size = New-Object System.Drawing.Size(410, 28)
$statusLabel.Location = New-Object System.Drawing.Point(10, 52)
$statusLabel.TextAlign = "MiddleCenter"
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
$form.Controls.Add($statusLabel)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Start All"
$btnStart.Size = New-Object System.Drawing.Size(195, 55)
$btnStart.Location = New-Object System.Drawing.Point(10, 95)
$btnStart.BackColor = [System.Drawing.Color]::FromArgb(22, 163, 74)
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = "Flat"
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "Stop All"
$btnStop.Size = New-Object System.Drawing.Size(195, 55)
$btnStop.Location = New-Object System.Drawing.Point(215, 95)
$btnStop.BackColor = [System.Drawing.Color]::FromArgb(220, 38, 38)
$btnStop.ForeColor = [System.Drawing.Color]::White
$btnStop.FlatStyle = "Flat"
$btnStop.Font = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$btnStop.Enabled = $false
$form.Controls.Add($btnStop)

$btnUser = New-Object System.Windows.Forms.Button
$btnUser.Text = "Open User UI"
$btnUser.Size = New-Object System.Drawing.Size(195, 45)
$btnUser.Location = New-Object System.Drawing.Point(10, 160)
$btnUser.BackColor = [System.Drawing.Color]::FromArgb(55, 65, 81)
$btnUser.ForeColor = [System.Drawing.Color]::FromArgb(147, 197, 253)
$btnUser.FlatStyle = "Flat"
$btnUser.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$btnUser.Enabled = $false
$form.Controls.Add($btnUser)

$btnAdmin = New-Object System.Windows.Forms.Button
$btnAdmin.Text = "Open Admin UI"
$btnAdmin.Size = New-Object System.Drawing.Size(195, 45)
$btnAdmin.Location = New-Object System.Drawing.Point(215, 160)
$btnAdmin.BackColor = [System.Drawing.Color]::FromArgb(55, 65, 81)
$btnAdmin.ForeColor = [System.Drawing.Color]::FromArgb(250, 204, 21)
$btnAdmin.FlatStyle = "Flat"
$btnAdmin.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$btnAdmin.Enabled = $false
$form.Controls.Add($btnAdmin)

$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Text = "Refresh Status"
$btnRefresh.Size = New-Object System.Drawing.Size(195, 40)
$btnRefresh.Location = New-Object System.Drawing.Point(10, 215)
$btnRefresh.BackColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$btnRefresh.ForeColor = [System.Drawing.Color]::FromArgb(167, 243, 208)
$btnRefresh.FlatStyle = "Flat"
$btnRefresh.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Controls.Add($btnRefresh)

$btnUpdate = New-Object System.Windows.Forms.Button
$btnUpdate.Text = "Update Project"
$btnUpdate.Size = New-Object System.Drawing.Size(195, 40)
$btnUpdate.Location = New-Object System.Drawing.Point(215, 215)
$btnUpdate.BackColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$btnUpdate.ForeColor = [System.Drawing.Color]::FromArgb(167, 243, 208)
$btnUpdate.FlatStyle = "Flat"
$btnUpdate.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Controls.Add($btnUpdate)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = "Vertical"
$logBox.Size = New-Object System.Drawing.Size(395, 140)
$logBox.Location = New-Object System.Drawing.Point(10, 268)
$logBox.BackColor = [System.Drawing.Color]::FromArgb(2, 6, 23)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(74, 222, 128)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($logBox)

$global:userProcess = $null
$global:adminProcess = $null

function Write-Log {
    param([string]$msg)
    $logBox.AppendText("[$(Get-Date -Format 'HH:mm:ss')] $msg`r`n")
}

function Test-Url {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
    } catch { return $false }
}

function Stop-AllServices {
    Write-Log "Stopping all services..."

    if ($global:userProcess -and !$global:userProcess.HasExited) {
        try { $global:userProcess.Kill() } catch {}
    }
    if ($global:adminProcess -and !$global:adminProcess.HasExited) {
        try { $global:adminProcess.Kill() } catch {}
    }

    Get-NetTCPConnection -LocalPort $UserPort -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Get-NetTCPConnection -LocalPort $AdminPort -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

    $global:userProcess = $null
    $global:adminProcess = $null
}

function Update-UI-State {
    param([bool]$running)
    if ($running) {
        $statusLabel.Text = "Status: Running"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(34, 197, 94)
        $btnStart.Enabled = $false
        $btnStop.Enabled = $true
        $btnUser.Enabled = $true
        $btnAdmin.Enabled = $true
    } else {
        $statusLabel.Text = "Status: Stopped"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
        $btnStart.Enabled = $true
        $btnStop.Enabled = $false
        $btnUser.Enabled = $false
        $btnAdmin.Enabled = $false
    }
}

$btnStart.Add_Click({
    $statusLabel.Text = "Status: Starting..."
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(250, 204, 21)
    $form.Refresh()

    if (!(Test-Path "$ProjectRoot\node_modules")) {
        Write-Log "Installing dependencies..."
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "cmd.exe"
        $psi.Arguments = "/c cd /d `"$ProjectRoot`" && npm install"
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $psi.RedirectStandardOutput = $true
        $p = [System.Diagnostics.Process]::Start($psi)
        $p.WaitForExit()
        Write-Log "Dependencies installed."
    }

    Stop-AllServices

    Write-Log "Starting user UI on port $UserPort..."
    $psiUser = New-Object System.Diagnostics.ProcessStartInfo
    $psiUser.FileName = "cmd.exe"
    $psiUser.Arguments = "/c cd /d `"$ProjectRoot`" && npm run dev -- --host 127.0.0.1 --strictPort"
    $psiUser.UseShellExecute = $false
    $psiUser.CreateNoWindow = $false
    $psiUser.WorkingDirectory = $ProjectRoot
    $global:userProcess = [System.Diagnostics.Process]::Start($psiUser)

    Write-Log "Starting admin UI on port $AdminPort..."
    $psiAdmin = New-Object System.Diagnostics.ProcessStartInfo
    $psiAdmin.FileName = "cmd.exe"
    $psiAdmin.Arguments = "/c cd /d `"$ProjectRoot`" && npm run dev:admin -- --host 127.0.0.1 --strictPort"
    $psiAdmin.UseShellExecute = $false
    $psiAdmin.CreateNoWindow = $false
    $psiAdmin.WorkingDirectory = $ProjectRoot
    $global:adminProcess = [System.Diagnostics.Process]::Start($psiAdmin)

    Start-Sleep -Seconds 4
    Write-Log "All services started!"
    Update-UI-State $true
})

$btnStop.Add_Click({
    Stop-AllServices
    Write-Log "All services stopped."
    Update-UI-State $false
})

$btnUser.Add_Click({
    Start-Process "http://localhost:$UserPort/auth"
    Write-Log "User UI opened in browser."
})

$btnAdmin.Add_Click({
    Start-Process "http://localhost:$AdminPort/"
    Write-Log "Admin UI opened in browser."
})

$btnRefresh.Add_Click({
    $userUp = Test-Url -Url "http://localhost:$UserPort/auth"
    $adminUp = Test-Url -Url "http://localhost:$AdminPort/"

    if ($userUp -and $adminUp) {
        $statusLabel.Text = "Status: User + Admin Running"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(34, 197, 94)
        Write-Log "User and admin UIs are reachable."
    } elseif ($userUp) {
        $statusLabel.Text = "Status: User Running"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(59, 130, 246)
        Write-Log "User UI is reachable."
    } elseif ($adminUp) {
        $statusLabel.Text = "Status: Admin Running"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(59, 130, 246)
        Write-Log "Admin UI is reachable."
    } else {
        $statusLabel.Text = "Status: All Stopped"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
        Write-Log "No UI endpoints are reachable."
    }
})

$btnUpdate.Add_Click({
    Write-Log "Updating project..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = "/c cd /d `"$ProjectRoot`" && git pull && npm install && npm run build && npm run build:admin"
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $false
    $psi.WorkingDirectory = $ProjectRoot
    [System.Diagnostics.Process]::Start($psi)
    Write-Log "Update command launched."
})

$form.Add_FormClosing({
    $running = $false
    if ($global:userProcess -and !$global:userProcess.HasExited) { $running = $true }
    if ($global:adminProcess -and !$global:adminProcess.HasExited) { $running = $true }

    if ($running) {
        $result = [System.Windows.Forms.MessageBox]::Show(
            "Services are still running. Stop them before closing?",
            "Confirm Close",
            "YesNo",
            "Question"
        )
        if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
            Stop-AllServices
        }
    }
})

if ((Test-Url -Url "http://localhost:$UserPort/auth") -or (Test-Url -Url "http://localhost:$AdminPort/")) {
    Update-UI-State $true
    Write-Log "Existing services detected."
} else {
    Update-UI-State $false
    Write-Log "Ready. Click 'Start All' to begin."
}

[void]$form.ShowDialog()
$form.Dispose()
