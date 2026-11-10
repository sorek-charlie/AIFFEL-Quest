# 단일 EXE 실행 검증

- 결과: **PASS** (종료 코드 0)
- 파일: YOLO_Standalone.exe / 297,803,878 bytes
- SHA-256: `ae9229aea0b3e45633e065ec0657b41531faa560f4f724427427b2d37c881787`
- 빌드: PyInstaller 6.22.3 / pyinstaller-hooks-contrib 2026.10
- 포함: Python 런타임, CPU 추론 라이브러리, 필수 DLL, 모델 2개, 버스 사진

## 검증 방법과 결과

빈 임시 폴더에 EXE 하나만 복사하고 PATH를 Windows 및 System32로 제한했다. PYTHONHOME/PYTHONPATH는 제거했다. EXE가 내장 런타임을 사용한 사실은 실행 manifest의 standalone_exe와 executable로 확인했다. 실행 중 패키지 자동 설치와 모델 다운로드를 사용하지 않도록 오프라인 모드로 실행했다.

탐지·분할 × conf=0.25/0.50 네 조건에서 모두 bus 1, person 4였다. 결과 이미지 4장과 비교 이미지 2장을 열어 확인했고, 객체 20개의 좌표·점수와 분할 마스크 10개의 해상도·이진값·픽셀 수를 검사했다. 입력 해시는 기존 사진과 일치한다.

검증은 빌드 PC에서 Python 경로를 제거한 격리 실행으로 수행했다. 별도의 Python 미설치 Windows 컴퓨터에서 직접 시험한 것은 아니다.

[상세 검증 JSON](STANDALONE_CHECK.json) · [파일 확인값](SHA256SUMS.txt) · [검증 스크립트](../실행프로그램/verify_standalone.py) · [전체 실행 안내](../README.md)
