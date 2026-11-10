# 실행프로그램

[전체 안내·과제 결과](../README.md) · [실행 코드](run.py) · [더블클릭 실행](실행.bat) · [설치 목록](requirements.txt) · [입력 사진](input/bus.jpg) · [Windows 패키지 기록](requirements-windows-verified.txt)

Windows에서는 이 폴더의 실행.bat를 더블클릭합니다. 처음 실행하면 필요한 경우 가상환경과 패키지를 설치합니다. Python 3.11 또는 3.12가 필요합니다. 이 PC에는 설치된 가상환경을 유지했습니다.

터미널에서는 이 폴더로 이동하여 실행합니다.

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe run.py
```

macOS/Linux에서는 `.venv/bin/python`을 사용합니다. 기본 결과는 상위 과제제출내용/outputs/local_run에 저장됩니다. 다른 사진은 `--source 사진경로 --output 저장폴더`로 지정합니다.
