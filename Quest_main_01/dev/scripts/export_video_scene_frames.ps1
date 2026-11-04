param([string]$InputManifest='dev/build/scene-inputs.json')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$workspaceRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$sceneOutput=Join-Path $workspaceRoot 'docs/submission/storyboard/scenes-16x9'
New-Item -ItemType Directory -Path $sceneOutput -Force | Out-Null
$scenes=Get-Content -LiteralPath (Join-Path $workspaceRoot $InputManifest) -Raw -Encoding utf8 | ConvertFrom-Json
foreach($scene in $scenes){
 $destination=Join-Path $sceneOutput $scene.file
 if(Test-Path -LiteralPath $destination){throw "Output already exists: $destination"}
 $sourceImage=[System.Drawing.Image]::FromFile($scene.source)
 $frame=[System.Drawing.Bitmap]::new(1920,1080)
 $graphics=[System.Drawing.Graphics]::FromImage($frame)
 try{
  # Technical video-frame export only; preserve generated artwork and aspect.
  $graphics.Clear([System.Drawing.Color]::White)
  $graphics.CompositingQuality=[System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $scale=[Math]::Min(1920.0/$sourceImage.Width,1080.0/$sourceImage.Height)
  $frameWidth=[int][Math]::Round($sourceImage.Width*$scale)
  $frameHeight=[int][Math]::Round($sourceImage.Height*$scale)
  $frameLeft=[int][Math]::Floor((1920-$frameWidth)/2)
  $frameTop=[int][Math]::Floor((1080-$frameHeight)/2)
  $graphics.DrawImage($sourceImage,[System.Drawing.Rectangle]::new($frameLeft,$frameTop,$frameWidth,$frameHeight))
  $frame.Save($destination,[System.Drawing.Imaging.ImageFormat]::Png)
 }finally{$graphics.Dispose();$frame.Dispose();$sourceImage.Dispose()}
}
Write-Output ('Exported '+$scenes.Count+' PNG frames at 1920x1080')
