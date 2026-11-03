$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
# Build cleanly in a staging folder; do not recursively remove a running app's cwd.
$outDir = Join-Path $projectRoot 'build\windows-package\ORBIT-Scheduler'
$resolvedOut = [System.IO.Path]::GetFullPath($outDir)
$expectedOut = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'build\windows-package\ORBIT-Scheduler'))
if ($resolvedOut -ne $expectedOut -or !$resolvedOut.StartsWith([System.IO.Path]::GetFullPath($projectRoot) + '\')) { throw 'Unsafe build output path' }
if (Test-Path -LiteralPath $resolvedOut) { Remove-Item -LiteralPath $resolvedOut -Recurse -Force }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$appDir = Join-Path $outDir 'app'
New-Item -ItemType Directory -Force -Path $appDir | Out-Null
foreach ($name in @('apps','packages','database')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $appDir -Recurse -Force
}
$runtimeDir = Join-Path $outDir 'runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$nodePath = (Get-Command node).Source
Copy-Item -LiteralPath $nodePath -Destination (Join-Path $runtimeDir 'node.exe') -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'infra\local\NODE-LICENSE.txt') -Destination (Join-Path $runtimeDir 'NODE-LICENSE.txt') -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'infra\local\SETUP.txt') -Destination (Join-Path $outDir 'Readme.txt') -Force
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$launcherSource = Join-Path $projectRoot 'infra\local\Launcher.cs'
& $compiler /nologo /target:winexe /utf8output /codepage:65001 "/out:$outDir\ORBIT-Scheduler.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll $launcherSource
if ($LASTEXITCODE -ne 0) { throw 'Launcher compilation failed' }
$deployDir = Join-Path $projectRoot 'dist\ORBIT-Scheduler'
$resolvedDeploy = [IO.Path]::GetFullPath($deployDir)
if ($resolvedDeploy -ne [IO.Path]::GetFullPath((Join-Path $projectRoot 'dist\ORBIT-Scheduler'))) { throw 'Unsafe deploy path' }
if (Test-Path -LiteralPath $resolvedDeploy) { Remove-Item -LiteralPath $resolvedDeploy -Recurse -Force }
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null
foreach ($file in Get-ChildItem -LiteralPath $outDir -Recurse -File) {
  $relativeFile = $file.FullName.Substring($outDir.Length + 1)
  $targetFile = Join-Path $deployDir $relativeFile
  New-Item -ItemType Directory -Force -Path (Split-Path $targetFile -Parent) | Out-Null
  if ((Test-Path -LiteralPath $targetFile) -and (Get-FileHash -LiteralPath $file.FullName).Hash -eq (Get-FileHash -LiteralPath $targetFile).Hash) { continue }
  try { Copy-Item -LiteralPath $file.FullName -Destination $targetFile -Force }
  catch {
    if ($file.Name -eq 'ORBIT-Scheduler.exe' -and (Test-Path -LiteralPath $targetFile) -and (Get-Item -LiteralPath $targetFile).LastWriteTimeUtc -ge (Get-Item -LiteralPath $launcherSource).LastWriteTimeUtc) { Write-Warning 'Retained a running current launcher.' }
    else { throw }
  }
}
# Ship one self-contained executable in the workspace root.
$zipPath = Join-Path $projectRoot 'dist\ORBIT-Scheduler-Windows.zip'
Compress-Archive -LiteralPath $outDir -DestinationPath $zipPath -Force
$bundleSource = Join-Path $projectRoot 'scripts\SubmissionBundle.cs'
$bundleCandidate = Join-Path $projectRoot 'build\CharlieScheduler-next.exe'
& $compiler /nologo /target:winexe /utf8output /codepage:65001 /reference:System.Windows.Forms.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll "/resource:$zipPath,payload.zip" "/out:$bundleCandidate" $bundleSource
if ($LASTEXITCODE -ne 0) { throw 'Single executable compilation failed' }
$rootLauncher = Join-Path $projectRoot 'Charlie;s Scheduler.exe'
Copy-Item -LiteralPath $bundleCandidate -Destination $rootLauncher -Force
$legacyRoot = Join-Path $projectRoot 'ORBIT-Scheduler.exe'
if (Test-Path -LiteralPath $legacyRoot) { Remove-Item -LiteralPath $legacyRoot -Force }
Write-Output "Built single executable: $rootLauncher"
