# 실행프로그램

[전체 안내·과제 결과](../README.md) · [단일 EXE 다운로드](https://github.com/sorek-charlie/AIFFEL-Quest/releases/download/yolo-standalone-v1.0.0/YOLO_Standalone.exe) · [추론 코드](run.py) · [EXE 진입 코드](standalone.py) · [빌드 설정](YOLO_Standalone.spec)

## EXE 실행 (Python 설치 불필요)

Windows 10/11 64비트용입니다. Releases에서 YOLO_Standalone.exe 하나를 다운로드해 더블클릭합니다. Python 런타임, PyTorch, Ultralytics, 모델 두 개와 예제 사진이 내장되어 있습니다. 별도 Python 설치·패키지 설치·모델 다운로드는 하지 않습니다.

EXE만 복사한 컴퓨터에서는 EXE 옆 YOLO_results 폴더에 결과가 생성됩니다. 이 과제의 실행프로그램 폴더에서는 상위 과제제출내용/outputs/local_run으로 저장합니다. 쓰기 가능한 폴더에서 실행하세요. 단일 EXE는 실행 때마다 임시 폴더에 런타임을 풀기 때문에 준비 시간이 필요합니다.

```powershell
.\YOLO_Standalone.exe
.\YOLO_Standalone.exe --source "C:\사진\photo.jpg" --output "C:\결과"
```

## Python 소스 실행

개발·재빌드할 때만 Python 3.11 또는 3.12가 필요합니다. [설치 목록](requirements.txt) · [검증된 Windows 패키지](requirements-windows-verified.txt) · [입력 사진](input/bus.jpg)

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe run.py
```

## 단일 EXE 재빌드

Windows에서 이 폴더로 이동한 뒤 실행합니다. [빌드 도구 목록](requirements-build.txt)

```powershell
.venv\Scripts\python.exe -m pip install -r requirements-build.txt
.venv\Scripts\python.exe -m PyInstaller --noconfirm YOLO_Standalone.spec
```

완성 파일은 dist/YOLO_Standalone.exe입니다. EXE는 GitHub Releases로 배포합니다. [PyInstaller 단일 파일·런타임 설명](https://pyinstaller.org/en/stable/runtime-information.html)

[단일 EXE 검증 결과](../과제제출내용/STANDALONE_CHECK.md) · [격리 검증 스크립트](verify_standalone.py)
