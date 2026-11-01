$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$sdkRoot=Join-Path $projectRoot 'build\android-sdk\tools'
$platformJar=(Get-ChildItem -LiteralPath $sdkRoot -Recurse -Filter android.jar | Select-Object -First 1).FullName
$buildTools=Split-Path (Get-ChildItem -LiteralPath $sdkRoot -Recurse -Filter aapt2.exe | Select-Object -First 1).FullName -Parent
if(!$platformJar -or !$buildTools){throw 'Android platform 35 and build-tools 35.0.0 are required under build/android-sdk/tools.'}
$workDir=Join-Path $projectRoot 'build\android-apk'
$classes=Join-Path $workDir 'classes'
$dex=Join-Path $workDir 'dex'
$outApk=Join-Path $projectRoot 'ORBIT-Android.apk'
New-Item -ItemType Directory -Force -Path $classes,$dex | Out-Null
$sources=@(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'apps\android\src') -Recurse -Filter '*.java' | ForEach-Object {$_.FullName})
& javac -encoding UTF-8 --release 8 -classpath $platformJar -d $classes @sources
if($LASTEXITCODE -ne 0){throw 'Android Java compilation failed'}
$classJar=Join-Path $workDir 'classes.jar'
& jar cf $classJar -C $classes .
if($LASTEXITCODE -ne 0){throw 'JAR build failed'}
& (Join-Path $buildTools 'd8.bat') --lib $platformJar --min-api 26 --output $dex $classJar
if($LASTEXITCODE -ne 0){throw 'DEX compilation failed'}
$unsigned=Join-Path $workDir 'unsigned.apk'
& (Join-Path $buildTools 'aapt2.exe') link -o $unsigned -I $platformJar --manifest (Join-Path $projectRoot 'apps\android\AndroidManifest.xml') --min-sdk-version 26 --target-sdk-version 35
if($LASTEXITCODE -ne 0){throw 'Android packaging failed'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$archive=[System.IO.Compression.ZipFile]::Open($unsigned,[System.IO.Compression.ZipArchiveMode]::Update)
try { [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $dex 'classes.dex'),'classes.dex') | Out-Null } finally {$archive.Dispose()}
$aligned=Join-Path $workDir 'aligned.apk'
& (Join-Path $buildTools 'zipalign.exe') -f 4 $unsigned $aligned
if($LASTEXITCODE -ne 0){throw 'APK alignment failed'}
$key=Join-Path $workDir 'development.keystore'
if(!(Test-Path -LiteralPath $key)) { & keytool -genkeypair -keystore $key -storepass android -keypass android -alias orbit-development -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=ORBIT Development,O=Local Development,C=KR'; if($LASTEXITCODE -ne 0){throw 'Development key generation failed'} }
& (Join-Path $buildTools 'apksigner.bat') sign --ks $key --ks-key-alias orbit-development --ks-pass pass:android --key-pass pass:android --out $outApk $aligned
if($LASTEXITCODE -ne 0){throw 'APK signing failed'}
& (Join-Path $buildTools 'apksigner.bat') verify --verbose $outApk
if($LASTEXITCODE -ne 0){throw 'APK signature verification failed'}
Write-Output "Built development APK: $outApk"
