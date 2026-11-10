"""Single-file Windows executable entry point; no external Python process."""
import multiprocessing
import os
import sys
import traceback

def main():
    multiprocessing.freeze_support()
    no_pause = "--no-pause" in sys.argv
    if no_pause:
        sys.argv.remove("--no-pause")
    os.environ["YOLO_OFFLINE"] = "true"
    os.environ["YOLO_AUTOINSTALL"] = "false"
    os.environ.setdefault("MPLBACKEND", "Agg")
    print("YOLO standalone / CPU - loading bundled runtime and models...", flush=True)
    code = 0
    try:
        import run
        print("Completed. Results have been saved.", flush=True)
    except SystemExit as exc:
        code = exc.code if isinstance(exc.code, int) else 1
    except Exception:
        traceback.print_exc()
        code = 1
    if not no_pause and sys.stdin is not None and sys.stdin.isatty():
        try:
            input("Press Enter to close.")
        except EOFError:
            pass
    return code

if __name__ == "__main__":
    sys.exit(main())
