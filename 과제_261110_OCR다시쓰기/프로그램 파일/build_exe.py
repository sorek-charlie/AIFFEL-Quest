"""Build the Windows EXE without a BAT wrapper."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent
work = root.parent.parent / '.build'
command = [sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean',
           '--onefile', '--windowed', '--name', 'OCR_Assignment',
           '--distpath', str(root), '--workpath', str(work / 'ocr-exe'),
           '--specpath', str(work)]
for module in ['PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'matplotlib',
               'pandas', 'scipy', 'torch', 'paddle', 'IPython']:
    command.extend(['--exclude-module', module])
command.append(str(root / 'ocr_app.py'))
subprocess.run(command, cwd=root, check=True)
