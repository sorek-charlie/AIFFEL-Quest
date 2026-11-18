$ErrorActionPreference = 'Stop'
$taskName = '업무작업실-정책공고-수집'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    throw '같은 이름의 작업이 이미 있어 덮어쓰지 않았습니다.'
}
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\pythonw.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Python 실행 파일을 찾지 못했습니다.' }
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $python -Argument '-m briefings.policy_jobs' -WorkingDirectory $root
$daily = New-ScheduledTaskTrigger -Daily -At '08:30'
$logon = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($daily,$logon) -Settings $settings -Principal $principal -Description '매일 08:30 또는 지연 로그인 시 기업마당 공고 수집' | Out-Null
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
