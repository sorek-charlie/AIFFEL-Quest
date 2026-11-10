# 실행프로그램

[공개 웹앱 열기](https://yolo-vision-lab-261110.cherrysocute9.chatgpt.site) · [전체 과제 안내](../README.md) · [웹 소스·개발 안내](web/README.md)

현재 실행 방식은 브라우저 웹앱입니다. EXE 배포는 제거했습니다. 방문자는 Python·Node.js 설치 없이 웹주소로 접속합니다.

## 로컬 웹 바로 실행

파일 탐색기에서 [로컬웹열기.cmd](로컬웹열기.cmd)를 더블클릭하세요. [시작 스크립트](start-local-web.ps1)가 Node.js 서버를 백그라운드에서 시작하고 브라우저를 엽니다. 이미 실행 중이면 기존 서버를 재사용합니다.

**[실행 중인 로컬 웹 열기](http://127.0.0.1:8765/)**

Node.js가 필요합니다. 로컬 주소는 해당 컴퓨터에서만 접근되며, CMD 파일은 GitHub 미리보기 화면에서 실행되지 않습니다.

## 로컬 웹 개발

Node.js가 있는 개발 PC에서 다음 명령으로 서버를 실행하고 http://127.0.0.1:8765 를 엽니다.

```powershell
node web/serve.mjs
```

[웹 화면](web/dist/index.html) · [앱 동작](web/dist/app.js) · [추론 처리](web/dist/inference.js) · [ONNX 변환](export_web.py)

## Python CLI 원본

[실행 코드](run.py) · [설치 목록](requirements.txt) · [입력 사진](input/bus.jpg)

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe run.py
```

기본 CLI 결과는 상위 과제제출내용/outputs/local_run에 생성됩니다. 웹 방문자는 이 설치 과정이 필요 없습니다.
