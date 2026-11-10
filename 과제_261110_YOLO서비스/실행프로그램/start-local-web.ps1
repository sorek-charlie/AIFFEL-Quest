param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$url = 'http://127.0.0.1:8765/'
$webRoot = Join-Path $PSScriptRoot 'web'

function Test-VisionServer {
    try {
        $health = Invoke-RestMethod -Uri ($url + 'healthz') -TimeoutSec 2
        return $health.appId -eq 'yolo-vision-lab'
    } catch {
        return $false
    }
}

try {
    if (-not (Test-VisionServer)) {
        $node = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $node) { throw 'Node.js가 필요합니다. 설치 없이 이용하려면 README의 공개 웹앱 링크를 여세요.' }
        $logDir = Join-Path $webRoot '.openai\.local\preview'
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        $stderr = Join-Path $logDir 'stderr.log'
        $process = Start-Process -FilePath $node.Source -ArgumentList 'serve.mjs' -WorkingDirectory $webRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'stdout.log') -RedirectStandardError $stderr -PassThru
        $ready = $false
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            if (Test-VisionServer) { $ready = $true; break }
            if ($process.HasExited) {
                $details = if (Test-Path -LiteralPath $stderr) { Get-Content -LiteralPath $stderr -Raw } else { '' }
                throw ('로컬 서버를 시작하지 못했습니다. 포트 8765 사용 여부를 확인하세요.' + "`n" + $details)
            }
            Start-Sleep -Milliseconds 250
        }
        if (-not $ready) { throw '서버 응답을 기다리는 시간이 초과됐습니다. 잠시 후 다시 실행하세요.' }
    }
    Write-Host ('로컬 웹 실행 중: ' + $url)
    if (-not $NoBrowser) { Start-Process $url }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
