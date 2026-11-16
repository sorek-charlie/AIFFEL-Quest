"""Colab 에서 브라우저 없이 도는 복원 스크립트 (projector_3d.ipynb 1~8단계).

입력:  /content/sample_01.zip, /content/make_splat.py
출력:  /content/scene_points.npz, /content/scene.ply, /content/scene.sog, /content/preview.png
마지막 줄:  RESULT_JSON {...}

- 결과 파일이 이미 있으면 그 단계를 건너뜀. 앞 단계를 새로 만들었으면 뒤 단계도 다시 함.
- 모델은 커널 전역 `model` 에 남겨 두어 같은 세션에서 다시 돌릴 때 다시 받지 않음.
- 실패하면 "REMOTE_FAILED" 줄을 찍고 예외를 다시 던짐 (run.sh 가 이 줄로 판단).
"""
import json
import os
import re
import subprocess
import sys
import threading
import time
import traceback
import zipfile

WORK = "/content"
ZIP = f"{WORK}/sample_01.zip"
IMG_ROOT = f"{WORK}/sample_01"
MAKE_SPLAT = f"{WORK}/make_splat.py"
NPZ = f"{WORK}/scene_points.npz"
PLY = f"{WORK}/scene.ply"
PLY_LOG = f"{WORK}/make_splat.log"      # make_splat 출력 (건너뛸 때 수치를 다시 읽음)
SOG = f"{WORK}/scene.sog"
PREVIEW = f"{WORK}/preview.png"
K, CROP_R = "1.4", "0.8"
SPLAT_TRANSFORM = "@playcanvas/splat-transform@3.10.3"
IMG_EXT = (".jpg", ".jpeg", ".png")

T_START = time.time()


def log(*a):
    print(f"[{time.time() - T_START:6.1f}s]", *a, flush=True)


class Heartbeat:
    """오래 걸리는 구간에서 20초마다 한 줄 찍어 colab exec 가 무출력으로 끊기지 않게."""

    def __init__(self, what, every=20):
        self.what, self.every = what, every
        self._stop = threading.Event()

    def __enter__(self):
        t0 = time.time()

        def beat():
            while not self._stop.wait(self.every):
                log(f"   ... {self.what} 진행 중 ({time.time() - t0:.0f}초)")

        self._th = threading.Thread(target=beat, daemon=True)
        self._th.start()
        return self

    def __exit__(self, *exc):
        self._stop.set()
        self._th.join(timeout=1)
        return False


def have(path):
    return os.path.exists(path) and os.path.getsize(path) > 0


def run_stream(cmd, what, cwd=WORK):
    """명령을 돌리며 출력 줄을 그대로 흘리고, 전체 출력을 돌려준다."""
    log("$ " + " ".join(cmd))
    lines = []
    with Heartbeat(what):
        p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                             text=True, bufsize=1)
        for line in p.stdout:
            line = line.rstrip("\n")
            lines.append(line)
            print("   | " + line, flush=True)
        rc = p.wait()
    if rc != 0:
        raise RuntimeError(f"{what} 실패 (종료 코드 {rc})")
    return "\n".join(lines)


# ---------------------------------------------------------------- 0. GPU
def step0_gpu():
    log("[0/8] GPU 확인")
    r = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("GPU 가 없습니다 (nvidia-smi 실패). colab new 에 --gpu T4 를 줬는지 보세요.")
    log("   GPU:", r.stdout.strip())


# ---------------------------------------------------------------- 1. 설치
def step1_install():
    log("[1/8] map-anything 설치")
    os.chdir(WORK)
    if os.path.exists(f"{WORK}/map-anything/.git") and os.path.exists(f"{WORK}/map-anything/.installed"):
        log("   이미 설치됨 → 건너뜀")
    else:
        if not os.path.exists(f"{WORK}/map-anything/.git"):
            run_stream(["git", "clone", "-q", "--depth", "1",
                        "https://github.com/facebookresearch/map-anything.git"], "git clone")
        # 토치는 다시 깔지 않는다 (Colab 기본 것을 그대로 씀)
        run_stream([sys.executable, "-m", "pip", "install", "-q", "-e", f"{WORK}/map-anything"],
                   "pip install")
        open(f"{WORK}/map-anything/.installed", "w").close()
    if f"{WORK}/map-anything" not in sys.path:
        sys.path.insert(0, f"{WORK}/map-anything")
    import mapanything  # noqa: F401
    log("   map-anything 준비 완료")


# ---------------------------------------------------------------- 2. 사진
def step2_images():
    log("[2/8] 사진 풀기")
    if not have(ZIP):
        raise RuntimeError(f"{ZIP} 가 없습니다. run.sh 의 업로드 단계를 확인하세요.")

    def find_dir():
        for r, _, fs in sorted(os.walk(IMG_ROOT)):
            if "__MACOSX" in r:
                continue
            if any(f.lower().endswith(IMG_EXT) for f in fs):
                return r
        return None

    img_dir = find_dir() if os.path.isdir(IMG_ROOT) else None
    if img_dir:
        log("   이미 풀려 있음 → 건너뜀")
    else:
        zipfile.ZipFile(ZIP).extractall(IMG_ROOT)
        img_dir = find_dir()
    if not img_dir:
        raise RuntimeError("zip 안에서 사진(.jpg/.jpeg/.png)을 못 찾았습니다.")
    n = len([f for f in os.listdir(img_dir) if f.lower().endswith(IMG_EXT)])
    log(f"   사진 폴더: {img_dir} / {n}장")
    return img_dir


# ---------------------------------------------------------------- 3~4. 복원 + 점구름
def step3_reconstruct(img_dir):
    log("[3/8] 복원 — 사진 전부를 한 번의 infer 에")
    import gc
    import numpy as np
    import torch
    os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
    from mapanything.models import MapAnything
    from mapanything.utils.image import load_images

    g = globals()
    gc.collect(); torch.cuda.empty_cache(); torch.cuda.reset_peak_memory_stats()
    if "model" not in g:
        log("   모델 받기 (facebook/map-anything-apache, 약 4.9GB, 3분쯤)")
        with Heartbeat("모델 받기"):
            g["model"] = MapAnything.from_pretrained("facebook/map-anything-apache").to("cuda")
    else:
        log("   모델이 이미 메모리에 있음 → 다시 받지 않음")
    model = g["model"]
    model.eval()

    views = load_images(img_dir)
    log(f"   불러온 사진: {len(views)}장")

    def run(extra):
        with torch.no_grad():
            try:
                return model.infer(views, memory_efficient_inference=True,
                                   use_amp=True, amp_dtype="fp16", **extra)
            except TypeError:      # 버전에 따라 use_amp 인자가 없을 때
                with torch.autocast("cuda", dtype=torch.float16):
                    return model.infer(views, memory_efficient_inference=True, **extra)

    t0 = time.time(); preds = None
    with Heartbeat("복원 계산"):
        for extra in [{}, {"minibatch_size": 1}]:
            try:
                preds = run(extra); break
            except torch.cuda.OutOfMemoryError:
                log("   GPU 메모리 부족 → minibatch_size=1 로 재시도")
                gc.collect(); torch.cuda.empty_cache()
            except TypeError as e:
                log(f"   인자 불일치({e}) → 다음 설정으로")
                continue
    if preds is None:
        raise RuntimeError("T4 로는 부족합니다 (OOM). L4 / A100 으로 바꿔야 합니다.")
    log("   복원 완료: %.1f초, 최대 GPU 메모리 %.2f GB"
        % (time.time() - t0, torch.cuda.max_memory_allocated() / 1e9))

    log("[4/8] 점구름 합치기와 다듬기")
    pts, cols, cams = [], [], []
    for p in preds:
        P = p["pts3d"][0].float().cpu().numpy().reshape(-1, 3)
        C = p["img_no_norm"][0].float().cpu().numpy().reshape(-1, 3)
        if C.max() > 1.5:
            C = C / 255.0
        ok = np.isfinite(P).all(1)
        if "mask" in p:
            ok &= p["mask"][0].float().cpu().numpy().reshape(-1) > 0.5
        pts.append(P[ok]); cols.append(C[ok])
        cams.append(p["camera_poses"][0].float().cpu().numpy())
    pts = np.concatenate(pts); cols = np.clip(np.concatenate(cols), 0, 1)
    cams = np.stack(cams)

    lo, hi = np.percentile(pts, 0.5, axis=0), np.percentile(pts, 99.5, axis=0)
    keep = ((pts >= lo) & (pts <= hi)).all(1)
    pts, cols = pts[keep], cols[keep]

    tmp = NPZ + ".tmp"
    with open(tmp, "wb") as fh:          # 다 쓴 뒤에만 이름을 바꿔 반쯤 쓴 파일을 남기지 않음
        np.savez_compressed(fh, points=pts, colors=cols, cam2world=cams)
    os.replace(tmp, NPZ)
    del preds, views
    gc.collect(); torch.cuda.empty_cache()
    log(f"   저장: {NPZ} ({os.path.getsize(NPZ) / 1e6:.1f}MB)")


def camera_stats():
    """scene_points.npz 에서 원점 카메라 수, 카메라 움직임 비율 계산 (건너뛰어도 항상 계산)."""
    import numpy as np
    d = np.load(NPZ)
    pts, cams = d["points"], d["cam2world"]
    cam_pos = cams[:, :3, 3]
    diag = lambda a: float(np.linalg.norm(a.max(0) - a.min(0)))
    ratio = diag(cam_pos) / diag(pts)
    n_origin = int((np.linalg.norm(cam_pos, axis=1) < 1e-4).sum())
    log(f"   점 개수: {len(pts):,}, 카메라 {len(cams)}대")
    log(f"   카메라 움직인 폭 / 장면 대각선: {ratio:.3f}  (0.1 보다 커야 함)")
    log(f"   원점에 있는 카메라 수: {n_origin}  (0 또는 1 이면 정상)")
    return {"n_points": int(len(pts)), "n_cameras": int(len(cams)),
            "origin_cameras": n_origin, "camera_motion_ratio": round(ratio, 4)}


# ---------------------------------------------------------------- 5. 미리보기
def step5_preview():
    log("[5/8] 미리보기 preview.png")
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np

    d = np.load(NPZ)
    P, C, cams = d["points"], d["colors"], d["cam2world"]
    cam, fwd = cams[:, :3, 3], cams[:, :3, 2]
    idx = np.random.default_rng(0).choice(len(P), min(80000, len(P)), replace=False)
    fig, ax = plt.subplots(1, 3, figsize=(16, 5))
    for a, (i, j, t) in zip(ax, [(0, 2, "top (X-Z)"), (0, 1, "front (X-Y)"), (2, 1, "side (Z-Y)")]):
        a.scatter(P[idx, i], P[idx, j], c=C[idx], s=0.3)
        a.scatter(cam[:, i], cam[:, j], c="red", s=20)
        a.quiver(cam[:, i], cam[:, j], fwd[:, i], fwd[:, j], color="red", scale=15)
        a.set_title(t); a.set_aspect("equal")
    for a in ax[1:]:
        a.invert_yaxis()            # 모델 좌표는 Y 가 아래
    plt.tight_layout()
    fig.savefig(PREVIEW, dpi=90)
    plt.close(fig)
    log(f"   저장: {PREVIEW}")


# ---------------------------------------------------------------- 6~7. 바닥·자르기·.ply
def parse_splat_log(text):
    m_deg = re.search(r"바닥 기울기 보정:\s*([-\d.]+)도", text)
    m_n = re.search(r"알갱이\s*([\d,]+)개", text)
    if not (m_deg and m_n):
        raise RuntimeError("make_splat.py 출력에서 바닥 보정 각도·알갱이 수를 못 읽었습니다.")
    return float(m_deg.group(1)), int(m_n.group(1).replace(",", ""))


def step6_ply(fresh):
    log(f"[6-7/8] 바닥 수평·자르기·알갱이 .ply (make_splat.py, K={K}, CROP={CROP_R})")
    if not fresh and have(PLY) and have(PLY_LOG):
        log("   scene.ply 이미 있음 → 건너뜀")
        return False, parse_splat_log(open(PLY_LOG, encoding="utf-8").read())
    if not have(MAKE_SPLAT):
        raise RuntimeError(f"{MAKE_SPLAT} 가 없습니다. run.sh 의 업로드 단계를 확인하세요.")
    for f in (PLY, PLY_LOG):
        if os.path.exists(f):
            os.remove(f)
    try:
        out = run_stream([sys.executable, "make_splat.py", "scene_points.npz", "scene.ply", K, CROP_R],
                         "make_splat.py")
    except Exception:
        if os.path.exists(PLY):
            os.remove(PLY)
        raise
    vals = parse_splat_log(out)
    with open(PLY_LOG, "w", encoding="utf-8") as fh:   # 성공했을 때만 남김 → 건너뛰기 기준
        fh.write(out)
    log(f"   scene.ply {os.path.getsize(PLY) / 1e6:.1f}MB")
    return True, vals


# ---------------------------------------------------------------- 8. .sog
def step8_sog(fresh):
    log(f"[8/8] .sog 로 줄이기 ({SPLAT_TRANSFORM})")
    if not fresh and have(SOG):
        log("   scene.sog 이미 있음 → 건너뜀")
    else:
        if os.path.exists(SOG):
            os.remove(SOG)
        try:
            run_stream(["npx", "-y", SPLAT_TRANSFORM, "-w", "scene.ply", "scene.sog"], "splat-transform")
        except Exception:
            if os.path.exists(SOG):
                os.remove(SOG)
            raise
        if not have(SOG):
            raise RuntimeError("splat-transform 은 끝났는데 scene.sog 가 없습니다.")
    size = os.path.getsize(SOG)
    log(f"   scene.sog {size / 1e6:.2f}MB")
    return size


# ---------------------------------------------------------------- main
def main():
    step0_gpu()
    step1_install()
    img_dir = step2_images()

    fresh = False
    if have(NPZ):
        log("[3/8] scene_points.npz 이미 있음 → 복원 건너뜀")
    else:
        step3_reconstruct(img_dir)
        fresh = True
    log("[4/8] 점구름 점검")
    cam = camera_stats()

    if fresh or not have(PREVIEW):
        step5_preview()
    else:
        log("[5/8] preview.png 이미 있음 → 건너뜀")

    fresh_ply, (floor_deg, n_splats) = step6_ply(fresh)
    fresh = fresh or fresh_ply
    sog_bytes = step8_sog(fresh)

    result = {
        "origin_cameras": cam["origin_cameras"],
        "camera_motion_ratio": cam["camera_motion_ratio"],
        "floor_correction_deg": floor_deg,
        "n_splats": n_splats,
        "sog_bytes": sog_bytes,
        "n_points": cam["n_points"],
        "n_cameras": cam["n_cameras"],
        "elapsed_sec": round(time.time() - T_START, 1),
    }
    log("완료")
    print("RESULT_JSON " + json.dumps(result, ensure_ascii=False), flush=True)


try:
    main()
except BaseException as e:
    traceback.print_exc()
    sys.stdout.flush()
    print(f"REMOTE_FAILED {type(e).__name__}: {e}", flush=True)
    raise
