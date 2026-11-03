param([Parameter(Mandatory=$true)][string]$FilePath)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
if([IO.Path]::GetExtension($FilePath) -eq '.docx'){
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $archive=[IO.Compression.ZipFile]::OpenRead($FilePath)
 try{$entry=$archive.GetEntry('word/document.xml');if(!$entry -or $entry.Length -gt 2097152){throw 'Invalid document'};$reader=New-Object IO.StreamReader($entry.Open());try{$xml=$reader.ReadToEnd()}finally{$reader.Dispose()};$settings=New-Object Xml.XmlReaderSettings;$settings.DtdProcessing=[Xml.DtdProcessing]::Prohibit;$settings.XmlResolver=$null;$xr=[Xml.XmlReader]::Create((New-Object IO.StringReader($xml)),$settings);$doc=New-Object Xml.XmlDocument;$doc.XmlResolver=$null;$doc.Load($xr);$xr.Dispose();$ns=New-Object Xml.XmlNamespaceManager($doc.NameTable);$ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main');foreach($p in $doc.SelectNodes('//w:p',$ns)){[Console]::WriteLine(($p.SelectNodes('.//w:t',$ns)|ForEach-Object{$_.InnerText}) -join '')}}
 finally{$archive.Dispose()};exit
}
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
function Wait-WinRT($Operation,[Type]$ResultType){$method=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'}|Select-Object -First 1;$task=$method.MakeGenericMethod($ResultType).Invoke($null,@($Operation));$task.GetAwaiter().GetResult()}
function Wait-Action($operation){$method=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and !$_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'}|Select-Object -First 1;$task=$method.Invoke($null,@($operation));$task.GetAwaiter().GetResult()}
function Read-Image($stream){$decoder=Wait-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder]);$bitmap=Wait-WinRT ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap]);try{$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages();if(!$engine){throw 'OCR language unavailable'};if($bitmap.PixelWidth -gt [Windows.Media.Ocr.OcrEngine]::MaxImageDimension -or $bitmap.PixelHeight -gt [Windows.Media.Ocr.OcrEngine]::MaxImageDimension){throw 'Image too large'};$result=Wait-WinRT ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult]);[Console]::WriteLine(($result.Lines|ForEach-Object{$_.Text}) -join "`n")}finally{$bitmap.Dispose()}}
$file=Wait-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($FilePath)) ([Windows.Storage.StorageFile])
if([IO.Path]::GetExtension($FilePath) -eq '.pdf'){
 $null=[Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]
 $pdf=Wait-WinRT ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument]);if($pdf.PageCount -gt 10){throw 'Maximum 10 PDF pages'}
 for($i=0;$i -lt $pdf.PageCount;$i++){$page=$pdf.GetPage($i);$stream=New-Object Windows.Storage.Streams.InMemoryRandomAccessStream;try{$render=$page.RenderToStreamAsync($stream);Wait-Action $render;$stream.Seek(0);Read-Image $stream}finally{$stream.Dispose();$page.Dispose()}}
}else{$stream=Wait-WinRT ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream]);try{Read-Image $stream}finally{$stream.Dispose()}}
