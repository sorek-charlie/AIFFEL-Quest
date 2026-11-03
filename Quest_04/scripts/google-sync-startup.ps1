[CmdletBinding()]
param(
    [ValidateSet('Install','Status','Run','Uninstall')][string]$Mode = 'Status',
    [string]$ProjectPath
)
$ErrorActionPreference = 'Stop'
$taskName = 'CharlieScheduler-GoogleSync'
if (!$ProjectPath) { $ProjectPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'Quest_03' }
$project = [IO.Path]::GetFullPath($ProjectPath)
$exe = Join-Path $project "Charlie's Scheduler.exe"

if ($Mode -eq 'Run') {
    # The app owns Google credentials, scheduling, catch-up and duplicate checks.
    # Keep this task alive while the launched app runs; IgnoreNew prevents overlap.
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:18701/api/v1/auth/session' -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) { Write-Output 'App already running; no additional process started.'; exit 0 }
    } catch { }
    if (!(Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Missing application: $exe" }
    $appProcess = Start-Process -FilePath $exe -WorkingDirectory $project -WindowStyle Hidden -PassThru
    $appProcess.WaitForExit()
    exit $appProcess.ExitCode
}

if ($Mode -eq 'Install') {
    if (!(Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Missing application: $exe" }
    if ([TimeZoneInfo]::Local.Id -ne 'Korea Standard Time') { throw 'Windows time zone must be Korea Standard Time (Asia/Seoul).' }
    $userId = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $PSCommandPath + '" -Mode Run -ProjectPath "' + $project + '"'
    $action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $project
    $triggers = @(New-ScheduledTaskTrigger -AtLogOn -User $userId)
    foreach ($time in @('00:00','08:00','12:00','18:00')) { $triggers += New-ScheduledTaskTrigger -Daily -At $time }
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'Start Charlie Scheduler at user logon and 00/08/12/18 KST; app recovers missed Google sync slots.' -Force | Out-Null
}
if ($Mode -eq 'Uninstall') {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Output 'Removed Google sync startup task. App data and credentials retained.'
    exit 0
}
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (!$task) { [pscustomobject]@{installed=$false;taskName=$taskName} | ConvertTo-Json; exit 2 }
$info = Get-ScheduledTaskInfo -TaskName $taskName
[pscustomobject]@{
    installed=$true;taskName=$taskName;state=[string]$task.State
    timeZone=[TimeZoneInfo]::Local.Id;dailyTimes=@('00:00','08:00','12:00','18:00')
    triggerTypes=@($task.Triggers | ForEach-Object {$_.CimClass.CimClassName})
    startWhenAvailable=$task.Settings.StartWhenAvailable
    allowOnBattery=!$task.Settings.DisallowStartIfOnBatteries
    keepRunningOnBattery=!$task.Settings.StopIfGoingOnBatteries
    multipleInstances=[string]$task.Settings.MultipleInstances
    executionTimeLimit=$task.Settings.ExecutionTimeLimit
    nextRunTime=$info.NextRunTime.ToString('o');lastTaskResult=$info.LastTaskResult
} | ConvertTo-Json -Depth 4
