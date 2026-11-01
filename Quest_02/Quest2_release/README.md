# Quest2 — SOLAR WAR (3D 우주 전쟁)

Three.js 기반 3D 우주 슈팅 게임.

## 실행 방법

| 방법 | 설명 |
|---|---|
| `SolarWar.exe` | Windows 실행파일. 더블클릭하면 기본 브라우저에서 게임이 열립니다. (콘솔 창을 닫으면 종료) |
| `index.html` | 단일 파일 버전. 다운로드 후 더블클릭하면 바로 실행됩니다 (서버 불필요). |

> exe는 서명되지 않아 Windows SmartScreen 경고가 뜰 수 있습니다 → "추가 정보 → 실행".

## 조작

- `W A S D` 이동 · `마우스` 조준 · 클릭/`SPACE` 발사
- `Q` 미사일 · `SHIFT` 부스트 · `1~5` 무기 전환 · `P` 일시 정지
- `−` / `+` 볼륨 · `M` 음소거 (오른쪽 위 볼륨 슬라이더로도 조절)
- 모바일 터치 지원

## 사운드

전투 개시와 함께 배경음악과 이벤트별 효과음(레이저·미사일·EMP·폭발·경보·승패 등)이 재생됩니다. 모든 소리는 Web Audio로 실시간 합성합니다.

## 크레딧

- 3D 엔진: [three.js](https://github.com/mrdoob/three.js) r180 (MIT License)
- 지구 텍스처: three.js examples (`earth_atmos_2048.jpg`)
- 그 외 행성·함선·이펙트·사운드: 절차적 생성
