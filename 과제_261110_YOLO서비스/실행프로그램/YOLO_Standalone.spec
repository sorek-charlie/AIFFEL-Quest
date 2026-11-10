# Build with: python -m PyInstaller --noconfirm YOLO_Standalone.spec
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, copy_metadata, get_package_paths
root = Path(SPECPATH)
datas = collect_data_files("ultralytics")
for package in ["ultralytics", "torch", "torchvision", "numpy", "pillow"]:
    datas += copy_metadata(package)
datas += [(str(root / "yolo26n.pt"), "."),
          (str(root / "yolo26n-seg.pt"), "."),
          (str(root / "input" / "bus.jpg"), "input")]
a = Analysis([str(root / "standalone.py")], pathex=[str(root)],
             binaries=[], datas=datas,
             hiddenimports=["run", "ultralytics.models.yolo", "torchvision"],
             hookspath=[], hooksconfig={}, runtime_hooks=[],
             excludes=["tkinter", "IPython", "pytest", "tensorboard", "notebook", "__main__"],
             noarchive=False)
# torchvision 0.29+ renamed its indirectly loaded native modules to *_stable.
# The current upstream hook only discovers the older _C name. Include all
# native files explicitly, keeping the standard dependency analysis/cache.
vision_dir = Path(get_package_paths("torchvision")[1])
for native in sorted(vision_dir.glob("*.pyd")) + sorted(vision_dir.glob("*.dll")):
    a.binaries += [("torchvision/" + native.name, str(native), "BINARY")]
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, a.binaries, a.datas, [], name="YOLO_Standalone",
          debug=False, bootloader_ignore_signals=False, strip=False, upx=False,
          console=True, disable_windowed_traceback=False)
