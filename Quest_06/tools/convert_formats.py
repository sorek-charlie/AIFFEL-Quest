"""스플랫 .ply 를 .compressed.ply / .sog / .spz 로 변환하고 형식별 수치를 표로 만든다.

사용:
    python convert_formats.py <scene.ply> <out_dir>

- 도구: npx -y @playcanvas/splat-transform@3.10.3  (-w 덮어쓰기)
  3.11.0 부터 기본인 SOG v3 는 Spark 가 못 읽을 수 있어 3.10.3 으로 고정한다.
- 알갱이 수 확인: 각 결과를 다시 .ply 로 풀어 헤더의 element vertex 를 읽는다.
- 결과: <out_dir>/formats.json, <out_dir>/formats.md
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

TOOL = ["npx", "-y", "@playcanvas/splat-transform@3.10.3"]
NPX = shutil.which("npx") or shutil.which("npx.cmd")


def run(args):
    t0 = time.perf_counter()
    r = subprocess.run([NPX] + TOOL[1:] + args, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    dt = time.perf_counter() - t0
    if r.returncode != 0:
        raise SystemExit(f"실패: {' '.join(args)}\n{r.stdout}\n{r.stderr}")
    return dt, (r.stdout + r.stderr)


def ply_count(path):
    with open(path, "rb") as f:
        head = f.read(4096).split(b"end_header")[0].decode("ascii", "replace")
    for line in head.splitlines():
        if line.startswith("element vertex"):
            return int(line.split()[-1])
    # compressed.ply 은 chunk/vertex 두 요소가 있음 -> vertex 를 위에서 찾음
    raise ValueError("vertex 수를 못 찾음: " + path)


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    stem = os.path.splitext(os.path.basename(src))[0]

    # 첫 실행의 npx 다운로드 시간이 변환 시간에 섞이지 않게 미리 한 번 부른다
    run(["--help"])

    rows = []
    src_n = ply_count(src)
    src_b = os.path.getsize(src)
    rows.append(dict(format="원본 .ply", file=os.path.basename(src), bytes=src_b,
                     convert_sec=None, n_splats=src_n, bytes_per_splat=src_b / src_n))

    for ext in [".compressed.ply", ".sog", ".spz"]:
        dst = os.path.join(out_dir, stem + ext)
        dt, _ = run(["-w", src, dst])
        b = os.path.getsize(dst)
        # 다시 풀어서 알갱이 수 확인
        with tempfile.TemporaryDirectory() as td:
            back = os.path.join(td, "back.ply")
            run(["-w", dst, back])
            n = ply_count(back)
        rows.append(dict(format=ext, file=os.path.basename(dst), bytes=b,
                         convert_sec=round(dt, 2), n_splats=n, bytes_per_splat=b / n))
        print(f"{ext:16s} {b:>12,} B  {dt:6.2f}s  {n:,}개  {b / n:6.2f} B/개", flush=True)

    with open(os.path.join(out_dir, "formats.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    md = ["| 형식 | 파일 크기 (바이트) | MB | 변환 시간 | 알갱이 수 | 알갱이당 바이트 | 원본 대비 |",
          "|---|---:|---:|---:|---:|---:|---:|"]
    for r in rows:
        t = "-" if r["convert_sec"] is None else f"{r['convert_sec']:.2f}초"
        md.append(f"| `{r['format']}` | {r['bytes']:,} | {r['bytes'] / 1e6:.1f} | {t} | "
                  f"{r['n_splats']:,} | {r['bytes_per_splat']:.2f} | "
                  f"{r['bytes'] / src_b * 100:.1f}% |")
    same = len({r["n_splats"] for r in rows}) == 1
    md.append("")
    md.append(f"알갱이 수 일치: {'예' if same else '아니오'}")
    with open(os.path.join(out_dir, "formats.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print("\n".join(md))


if __name__ == "__main__":
    main()
