"""scene_points.npz -> INRIA 3DGS 이진 .ply (실수 17칸, 알갱이 하나 68바이트)

사용:
    python make_splat.py <scene_points.npz> <out.ply> [K] [CROP] [N_KEEP]

    K       알갱이 반지름 계수.  r = K * 장면의 가장 긴 변 / sqrt(N)   (기본 1.4)
    CROP    물체 주변 수평 반경. 0 이면 자르지 않음, 음수면 자동        (기본 0)
    N_KEEP  사용할 알갱이 수. 0 이면 전체, 숫자면 그만큼 고르게 뽑음    (기본 0)

노드07 실습 2 의 요구사항:
  - y, z 부호 뒤집기 (MapAnything: Y 아래 / three.js: Y 위)
  - 색은 0차 구면 조화 계수 f_dc 로, 1차 이상 계수(f_rest)는 헤더에서 제외
  - 크기는 log 값, 불투명도 0.9 는 시그모이드 전 값(logit), 회전은 (1,0,0,0), 법선 0
  - 알갱이 개수, 반지름, 가장 긴 변, 파일 크기, 저장 시간 출력
"""
import json
import os
import sys
import time

import numpy as np

src, out = sys.argv[1], sys.argv[2]
K = float(sys.argv[3]) if len(sys.argv) > 3 else 1.4
CROP = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
N_KEEP = int(sys.argv[5]) if len(sys.argv) > 5 else 0

d = np.load(src)
P = d["points"].astype(np.float64)
C = d["colors"].astype(np.float32)
cams = d["cam2world"].astype(np.float64)
cam_pos = cams[:, :3, 3]
N_IN = len(P)

# 0) 카메라 퍼짐 비 = 카메라 위치 상자 대각선 / 장면 상자 대각선
spread = float(np.linalg.norm(cam_pos.max(0) - cam_pos.min(0)) /
               np.linalg.norm(P.max(0) - P.min(0)))
print(f"입력 점 {N_IN:,}개, 카메라 {len(cams)}대, 카메라 퍼짐 비 {spread:.3f}")

# 1) 모델 좌표(Y 아래)를 three.js 좌표(Y 위)로: y, z 부호 뒤집기
flip = np.diag([1.0, -1.0, -1.0])
P = P @ flip.T
cam_pos = cam_pos @ flip.T

# 2) 바닥 수평 맞추기: 장면 대부분이 바닥이라 분산이 가장 작은 축이 바닥의 법선
center = np.median(P, axis=0)
sample = P[np.random.default_rng(0).choice(len(P), min(300_000, len(P)), replace=False)]
_, _, vt = np.linalg.svd(sample - sample.mean(0), full_matrices=False)
n = vt[2]
if np.dot(cam_pos.mean(0) - center, n) < 0:   # 카메라가 있는 쪽이 위
    n = -n
up = np.array([0.0, 1.0, 0.0])
v, c = np.cross(n, up), float(np.dot(n, up))
if np.linalg.norm(v) < 1e-9:
    R = np.eye(3)
else:
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    R = np.eye(3) + vx + vx @ vx * (1 / (1 + c))
P = (P - center) @ R.T
cam_pos = (cam_pos - center) @ R.T
floor_y = np.percentile(P[:, 1], 20)
P[:, 1] -= floor_y
cam_pos[:, 1] -= floor_y
floor_deg = float(np.degrees(np.arccos(np.clip(c, -1, 1))))
print("바닥 기울기 보정: %.1f도" % floor_deg)

# 2-1) 물체 주변만 남기기
target = None
if CROP != 0:
    # 카메라 시선이 가장 가깝게 모이는 점 = 찍은 물체
    fwd = cams[:, :3, 2] @ flip.T @ R.T
    fwd /= np.linalg.norm(fwd, axis=1, keepdims=True)
    A = np.zeros((3, 3)); b = np.zeros(3)
    for o_, f_ in zip(cam_pos, fwd):
        Pm = np.eye(3) - np.outer(f_, f_); A += Pm; b += Pm @ o_
    tgt = np.linalg.solve(A, b)
    hd = np.hypot(P[:, 0] - tgt[0], P[:, 2] - tgt[2])
    if CROP < 0:
        up_pts = (P[:, 1] > 0.08) & (hd < 1.2)
        CROP = float(np.percentile(hd[up_pts], 97) * 1.6)
    top = np.percentile(P[(hd < CROP) & (P[:, 1] > 0.08), 1], 99.5) + 0.1
    keep = (hd < CROP) & (P[:, 1] < top) & (P[:, 1] > -0.15)
    P, C = P[keep], C[keep]
    shift = np.array([tgt[0], 0.0, tgt[2]])
    P -= shift; cam_pos = cam_pos - shift
    target = tgt.round(3).tolist()
    print(f"물체 중심 {tgt.round(2)}, 반경 {CROP:.2f}, 높이 {top:.2f} 안쪽만 남김")

# 2-2) N_KEEP: 고르게 뽑기
if N_KEEP and N_KEEP < len(P):
    idx = np.linspace(0, len(P) - 1, N_KEEP).astype(np.int64)
    P, C = P[idx], C[idx]
    print(f"N_KEEP={N_KEEP:,} 로 고르게 줄임")

# 3) 알갱이 반지름: r = K * 가장 긴 변 / sqrt(N)
N = len(P)
longest = float((P.max(0) - P.min(0)).max())
r = K * longest / np.sqrt(N)

# 4) 17 칸 기록
SH0 = 0.28209479177387814
data = np.zeros((N, 17), dtype=np.float32)
data[:, 0:3] = P
data[:, 6:9] = (C - 0.5) / SH0                     # f_dc (0차 SH)
data[:, 9] = np.log(0.9 / 0.1)                     # opacity: sigmoid 전 값
data[:, 10:13] = np.log(r)                         # scale: log
data[:, 13] = 1.0                                  # rot (1,0,0,0)

names = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2", "opacity",
         "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
header = "ply\nformat binary_little_endian 1.0\nelement vertex %d\n" % N
header += "".join(f"property float {k}\n" for k in names) + "end_header\n"

t0 = time.perf_counter()
with open(out, "wb") as f:
    f.write(header.encode("ascii"))
    f.write(data.astype("<f4").tobytes())
dt = time.perf_counter() - t0
size = os.path.getsize(out)

print(f"알갱이 {N:,}개 / 반지름 {r:.5f} / 가장 긴 변 {longest:.3f} / K={K}")
print(f"파일 {size:,} 바이트 ({size / 1e6:.1f}MB), 헤더 {len(header)} 바이트, "
      f"알갱이당 {size / N:.2f} 바이트, 저장 {dt:.2f}초")

stats = dict(input_points=N_IN, n_cameras=int(len(cams)), camera_spread_ratio=round(spread, 4),
             floor_correction_deg=round(floor_deg, 1), crop_radius=CROP, object_center=target,
             n_keep=N_KEEP, n_splats=N, K=K, radius=r, longest_side=longest,
             ply_bytes=size, header_bytes=len(header), bytes_per_splat=size / N,
             save_sec=round(dt, 3))
with open(os.path.splitext(out)[0] + "_stats.json", "w", encoding="utf-8") as f:
    json.dump(stats, f, ensure_ascii=False, indent=2)
