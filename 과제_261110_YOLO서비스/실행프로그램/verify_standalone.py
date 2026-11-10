"""Verify the single EXE in an empty folder with Python removed from PATH."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, default=Path(__file__).parent / "YOLO_Standalone.exe")
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    exe = args.exe.resolve()
    with tempfile.TemporaryDirectory(prefix="yolo-standalone-test-") as tmp:
        folder = Path(tmp)
        isolated_exe = folder / exe.name
        shutil.copy2(exe, isolated_exe)
        assert sorted(x.name for x in folder.iterdir()) == [exe.name]
        env = os.environ.copy()
        windows = Path(env.get("SystemRoot", "C:/Windows"))
        env["PATH"] = str(windows / "System32") + os.pathsep + str(windows)
        env.pop("PYTHONHOME", None)
        env.pop("PYTHONPATH", None)
        env["YOLO_OFFLINE"] = "true"
        env["YOLO_AUTOINSTALL"] = "false"
        completed = subprocess.run([str(isolated_exe), "--no-pause"], cwd=folder,
                                   env=env, capture_output=True, timeout=1200)
        log = (completed.stdout + completed.stderr).decode("utf-8", errors="replace")
        print(log, flush=True)
        if completed.returncode:
            raise RuntimeError("Standalone EXE exit code: " + str(completed.returncode))
        output = folder / "YOLO_results"
        manifest = json.loads((output / "manifest.json").read_text("utf-8"))
        summary = json.loads((output / "summary.json").read_text("utf-8"))
        assert manifest["standalone_exe"] is True
        assert manifest["input_sha256"] == "c02019c4979c191eb739ddd944445ef408dad5679acab6fd520ef9d434bfbc63"
        assert Path(manifest["executable"]).resolve() == isolated_exe
        assert len(summary) == 4
        from PIL import Image
        import numpy as np
        masks = 0
        for row in summary:
            assert row["count"] == 5 and row["classes"] == {"bus": 1, "person": 4}
            dest = output / (row["task"] + "_" + format(row["conf"], ".2f"))
            boxes = json.loads((dest / "boxes.json").read_text("utf-8"))
            assert len(boxes["objects"]) == 5
            with Image.open(dest / "result.jpg") as im:
                assert im.size == (810, 1080)
                im.verify()
            for obj in boxes["objects"]:
                x1, y1, x2, y2 = obj["xyxy"]
                assert 0 <= x1 <= x2 <= 810 and 0 <= y1 <= y2 <= 1080
                assert obj["confidence"] >= row["conf"]
                if "mask_file" in obj:
                    with Image.open(dest / obj["mask_file"]) as im:
                        assert im.size == (810, 1080)
                        array = np.array(im)
                    assert set(np.unique(array)).issubset({0, 255})
                    assert int((array > 0).sum()) == obj["mask_pixels"]
                    masks += 1
        assert masks == 10
        for task in ["detect", "segment"]:
            with Image.open(output / (task + "_comparison.jpg")) as im:
                im.verify()
        report = {
            "tested_utc": datetime.now(timezone.utc).isoformat(),
            "status": "PASS", "exe": exe.name,
            "size_bytes": exe.stat().st_size,
            "sha256": hashlib.sha256(exe.read_bytes()).hexdigest(),
            "method": "Copied only EXE into empty temporary folder; PATH limited to Windows/System32 and Windows; PYTHONHOME/PYTHONPATH removed; offline mode; bundled runtime confirmed by executable/standalone_exe in manifest.",
            "limitation": "Isolated execution on build computer; a separate clean Windows computer was not available.",
            "standalone_exe": manifest["standalone_exe"],
            "input_sha256": manifest["input_sha256"],
            "versions": manifest["versions"], "summary": summary,
            "validated_masks": masks, "exit_code": completed.returncode
        }
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print("PASS: standalone execution and outputs verified", flush=True)


if __name__ == "__main__":
    main()
