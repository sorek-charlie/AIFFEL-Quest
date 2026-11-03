param([switch]$Apply)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$keep=@('submission-repo','github-sync-base.json')
$targets=@()
foreach($name in @('.playwright-mcp','dist','ORBIT-Android.apk','ORBIT-Android.apk.idsig','orbit-scheduler-scaffold.zip','smoke-result.txt')) { $p=Join-Path $root $name; if(Test-Path -LiteralPath $p){$targets+=Get-Item -LiteralPath $p -Force} }
$build=Join-Path $root 'build'
if(Test-Path -LiteralPath $build){$targets+=Get-ChildItem -LiteralPath $build -Force | Where-Object {$_.Name -notin $keep}}
foreach($name in @('dist','.next','.vinext','.wrangler')){ $p=Join-Path $root ('sites\orbit-booking\'+$name);if(Test-Path -LiteralPath $p){$targets+=Get-Item -LiteralPath $p -Force} }
$removed=@();$failed=@()
foreach($item in $targets){
 $resolved=[IO.Path]::GetFullPath($item.FullName)
 if(!$resolved.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Cleanup target outside workspace'}
 if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Cleanup refuses reparse points'}
 $relative=$resolved.Substring($root.Length+1)
 if(!$Apply){Write-Output $relative;continue}
 $files=if($item.PSIsContainer){@(Get-ChildItem -LiteralPath $resolved -File -Recurse -Force)}else{@($item)}
 $bytes=($files | Measure-Object -Property Length -Sum).Sum
 try{Remove-Item -LiteralPath $resolved -Recurse -Force;$removed+=@{path=$relative;files=$files.Count;bytes=[long]$bytes}}
 catch{$failed+=@{path=$relative;reason='File in use or access restricted'}}
}
if($Apply){$previous=if(Test-Path -LiteralPath (Join-Path $root 'docs\quality\cleanup-report.json')){Get-Content -LiteralPath (Join-Path $root 'docs\quality\cleanup-report.json') -Raw|ConvertFrom-Json}else{$null};$report=@{observedRemovedGroups=$(if($previous.observedRemovedGroups){$previous.observedRemovedGroups}else{$previous.previousObservedRemovedGroups});checkedAt=(Get-Date).ToUniversalTime().ToString('o');removed=$removed;failed=$failed;removedFiles=($removed|ForEach-Object {$_.files}|Measure-Object -Sum).Sum;removedBytes=($removed|ForEach-Object {$_.bytes}|Measure-Object -Sum).Sum;preserved=@("Charlie's Scheduler.exe",'source and tests','runtime data and backups','GitHub mirror and sync baseline','site source and dependencies','submission evidence')};[IO.File]::WriteAllText((Join-Path $root 'docs\quality\cleanup-report.json'),($report|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false));Write-Output "Removed $($report.removedFiles) generated files; preserved app, source, data and sync"}
