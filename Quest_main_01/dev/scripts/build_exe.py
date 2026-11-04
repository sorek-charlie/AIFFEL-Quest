"""Build a single portable Windows executable using the installed .NET compiler."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'dev' / 'build'
OUT = ROOT
BUILD.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)
files = [ROOT / 'index.html']
for directory in ['app','docs']:
    files.extend(p for p in (ROOT / directory).rglob('*') if p.is_file() and not p.name.startswith('debug-'))
files.sort()
checksums = '\n'.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.relative_to(ROOT).as_posix() for p in files)
version = 'v7-' + hashlib.sha256(checksums.encode('utf8')).hexdigest()[:16]
(BUILD / 'build-id.txt').write_text(version, encoding='utf8')
with ZipFile(BUILD / 'app.zip', 'w', compression=ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        z.write(p, p.relative_to(ROOT).as_posix())
    z.writestr('checksums.txt', checksums.encode('utf8'))
compiler = Path('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe')
if not compiler.exists():
    compiler = Path('C:/Windows/Microsoft.NET/Framework/v4.0.30319/csc.exe')
out = OUT / '경정청구.exe'
compiled = BUILD / 'ReturnCheck-new.exe'
subprocess.run([str(compiler), '/nologo', '/target:winexe', '/platform:x64', '/optimize+', '/utf8output',
                '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.Web.Extensions.dll', '/reference:System.IO.Compression.dll',
                '/reference:System.IO.Compression.FileSystem.dll',
                '/reference:' + str(ROOT/'app/vendor/webview2/Microsoft.Web.WebView2.Core.dll'),
                '/reference:' + str(ROOT/'app/vendor/webview2/Microsoft.Web.WebView2.WinForms.dll'),
                '/resource:' + str(BUILD / 'app.zip') + ',ReturnCheck.App',
                '/resource:' + str(BUILD / 'build-id.txt') + ',ReturnCheck.Build',
                '/out:' + str(compiled), str(ROOT / 'dev' / 'scripts' / 'ReturnCheckLauncher.cs'), str(ROOT / 'dev' / 'scripts' / 'AcquisitionHost.cs'),str(ROOT/'dev/scripts/InstitutionCollectorForm.cs'),str(ROOT/'dev/scripts/InstitutionCollectorSmoke.cs')], check=True)
try:
    compiled.replace(out)
except PermissionError:
    # Windows permits renaming a running image. Preserve it under ignored build
    # output, so the user's open instance continues while the next launch updates.
    old = BUILD / ('ReturnCheck-running-' + hashlib.sha256(out.read_bytes()).hexdigest()[:12] + '.exe')
    if old.exists():
        old = BUILD / (old.stem + '-' + str(__import__('time').time_ns()) + '.exe')
    assert out.resolve().is_relative_to(ROOT.resolve()) and old.resolve().is_relative_to((ROOT/'dev/build').resolve())
    out.rename(old)
    try:
        compiled.replace(out)
    except Exception:
        old.rename(out)
        raise
print(out)
print('Build:', version, '| Files:', len(files), '| Bytes:', out.stat().st_size)
print('SHA256:', hashlib.sha256(out.read_bytes()).hexdigest())
