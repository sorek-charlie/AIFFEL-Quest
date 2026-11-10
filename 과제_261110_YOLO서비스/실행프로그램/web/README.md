# Vision Lab 웹앱

[공개 웹앱 열기](https://yolo-vision-lab-261110.cherrysocute9.chatgpt.site) · [웹 화면 소스](dist/index.html) · [앱 동작](dist/app.js) · [전처리·NMS·마스크 계산](dist/inference.js) · [모델 정보](dist/models/metadata.json)

사진 선택 → 탐지 또는 분할 선택 → 분석 시작 순서로 사용합니다. 사진은 서버로 전송하지 않고 ONNX Runtime Web의 WASM CPU 실행기로 브라우저 안에서 분석합니다. 임계값 조절, 0.25/0.50 비교, 결과 PNG·좌표 JSON·객체별 이진 마스크 PNG 다운로드를 지원합니다.

## 로컬 실행

Node.js가 설치된 개발 PC에서 이 폴더로 이동해 실행합니다. dist 안에 런타임과 모델이 포함되어 있어 서버를 띄울 때 npm 설치는 필요 없습니다.

```powershell
node serve.mjs
```

브라우저에서 http://127.0.0.1:8765 를 엽니다. index.html을 파일 더블클릭으로 여는 대신 HTTP 서버를 사용해야 모델과 WASM을 불러올 수 있습니다. 공개 웹앱 방문자는 Python·Node.js 설치가 필요 없습니다.

## 모델 변환

[상위 변환 코드](../export_web.py)는 기존 .pt 모델을 640×640, FP32, ONNX opset 17로 내보냅니다. [변환 패키지](../requirements-web-export.txt)를 설치한 뒤 실행합니다. [모델 파일](dist/models/)과 [브라우저 런타임](dist/vendor/)은 함께 배포합니다.

출력은 탐지 [1,84,8400], 분할 [1,116,8400] 및 [1,32,160,160]입니다. 클래스별 IoU 0.70 NMS와 원본 좌표 복원을 적용합니다. 분할은 계수×프로토타입 계산, bilinear 확장, 박스 크롭, 0 임계값으로 이진 마스크를 만듭니다. 큰 사진은 긴 변 1600px로 축소해 처리합니다.

## 재현 범위

브라우저 Canvas 보간과 고정 정사각형 입력은 최초 PyTorch 실행의 전처리와 다를 수 있으므로 점수·좌표·마스크가 동일하다고 보장하지 않습니다. 기존 보고서는 최초 PyTorch 실행을 설명합니다. [웹 검증 기록](../../과제제출내용/WEB_CHECK.md)에서 실제 브라우저 결과를 확인하세요.

[ONNX Runtime 공식 문서](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) · [Ultralytics 공식 문서](https://docs.ultralytics.com/modes/export/)
