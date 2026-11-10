# 웹 실행 안내

[README](README.md) · [웹 서버 코드](프로그램%20파일/web_app.py) · [HTML 화면](프로그램%20파일/web/index.html) · [웹 패키지](프로그램%20파일/requirements-web.txt) · [화면 미리보기](참고자료/web-preview.png) · [전체 제출 ZIP](OCR_Assignment_Final.zip)

## 실행

과제 폴더에서 다음 명령을 실행합니다.

```powershell
cd "프로그램 파일"
python -m pip install -r requirements-web.txt
python web_app.py
```

브라우저가 자동으로 열립니다. [http://127.0.0.1:8501](http://127.0.0.1:8501)에 접속합니다. 터미널을 닫거나 Ctrl+C를 누르면 서버가 종료됩니다. 다른 포트는 `python web_app.py --port 8502`로 지정합니다.

## 화면 구성

- **왼쪽 INPUT**: 입력 이미지, 원문 정보, 추출 실행 버튼. 이미지를 누르면 원본 크기로 엽니다.
- **오른쪽 OUTPUT**: 자동 추출 표 / 텍스트 / 교정 표 / 영역 보기 / 원시 OCR 탭.
- **다운로드**: 자동 표 CSV, 교정 표 CSV, 텍스트, 구조 JSON, 보고서 PDF.

추출 버튼은 이미지 구분선과 기존 OCR 좌표로 11행 × 3열과 제목·각주 3개를 분리합니다. 이어서 수동 검토값으로 교정 표를 생성합니다. 결과는 참고자료/outputs에 저장합니다. 같은 이름의 생성 결과는 갱신하며, 원시 OCR과 좌표는 수정하지 않습니다.

## 입력 범위와 실행 조건

포함된 census-table.png와 저장된 OCR 좌표를 사용합니다. 임의 이미지 업로드·새 OCR 모델 추론은 이 화면에 포함되지 않습니다. 새 OCR 인식은 [run_ocr.py](프로그램%20파일/run_ocr.py)를 전체 OCR 환경에서 실행합니다.

로컬 웹 서버는 현재 PC의 127.0.0.1에만 연결됩니다. 다른 PC에서는 파일을 내려받아 서버를 실행해야 합니다. GitHub 페이지 자체는 Python 서버를 실행하지 않습니다.

[웹 검증 기록](참고자료/WEB_VALIDATION.json)에서 실행·레이아웃·다운로드 검증 결과를 확인할 수 있습니다.
