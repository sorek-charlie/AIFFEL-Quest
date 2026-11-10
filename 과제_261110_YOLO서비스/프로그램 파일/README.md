# 프로그램 실행

[과제 설명 및 결과 바로 보기](../README.md)

이 폴더에서 실행합니다. Python 3.11.14 / CPU 환경에서 검증했습니다.

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe run.py --source input/bus.jpg --output outputs/my_run
```

[실행 코드](run.py) · [입력 사진](input/bus.jpg) · [설치 목록](requirements.txt) · [검증된 Windows 패키지](requirements-windows-verified.txt)

macOS/Linux에서는 `.venv/bin/python`을 사용합니다. 결과는 위에서 지정한 `outputs/my_run`에 생성됩니다.
