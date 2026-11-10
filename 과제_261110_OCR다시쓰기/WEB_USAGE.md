# 웹 실행 및 업로드 OCR

[README](README.md) · [웹 서버](프로그램%20파일/web_app.py) · [업로드 OCR 코드](프로그램%20파일/upload_ocr.py) · [웹 화면](프로그램%20파일/web/index.html) · [웹 패키지](프로그램%20파일/requirements-web.txt) · [기본 화면](참고자료/web-preview.png) · [업로드 화면](참고자료/web-upload-preview.png)

## 설치와 실행

```powershell
cd "프로그램 파일"
python -m pip install -r requirements-web.txt
python web_app.py
```

브라우저에서 [http://127.0.0.1:8501](http://127.0.0.1:8501)에 접속합니다. 서버는 현재 PC에서만 접근합니다. Ctrl+C로 종료합니다. 다른 포트는 `python web_app.py --port 8502`로 지정합니다.

### 업로드 OCR 엔진

업로드에는 Python 패키지와 별도로 **Tesseract 실행 프로그램 및 kor/eng 언어 데이터**가 필요합니다. [공식 설치 안내](https://tesseract-ocr.github.io/tessdoc/Installation.html)를 따르세요. 현재 PC에는 설치되어 있습니다.

프로그램은 `TESSERACT_CMD` 환경변수, PATH, Windows 기본 설치 경로 순서로 찾습니다. 별도 위치라면 다음처럼 지정합니다.

```powershell
$env:TESSERACT_CMD = "C:\Program Files\Tesseract-OCR\tesseract.exe"
& $env:TESSERACT_CMD --list-langs
python web_app.py
```

언어 목록에 `kor`, `eng`가 있어야 한국어+영어 모드를 사용할 수 있습니다. 데이터 경로가 기본 위치와 다르면 `TESSDATA_PREFIX`를 실제 tessdata 폴더로 지정하세요. 설치나 언어가 없으면 웹 화면에 오류를 표시합니다.

## 기본값: 과제 제출 자료

처음 접속하거나 새로고침하면 **과제 제출 자료 (기본)**이 선택됩니다. 왼쪽 원본 이미지와 오른쪽 기존 결과를 즉시 확인할 수 있습니다. 추출 버튼은 기존 PaddleOCR 좌표와 이미지 구분선을 이용해 11행 × 3열 및 제목·각주 3개를 재생성하고 별도의 수동 검토값으로 교정 표를 만듭니다.

## 다른 PDF·이미지 OCR

1. 왼쪽 입력 자료에서 **다른 PDF·이미지 업로드**를 선택합니다.
2. 파일을 업로드합니다. 최대 30MB, PDF 최대 50쪽이며 PNG/JPG/WEBP/BMP/TIFF도 지원합니다.
3. 언어를 한국어+English / English / 한국어 중 선택합니다.
4. 추출 버튼을 누릅니다. PDF는 페이지별 처리 진행률을 표시합니다.
5. 오른쪽에서 페이지를 선택하고 표·텍스트·영역·원시 OCR을 확인합니다. 해당 페이지의 표 CSV·텍스트·좌표 JSON을 내려받습니다.
6. 입력 자료를 **과제 제출 자료 (기본)**으로 바꾸면 제출 결과로 돌아옵니다.

PDF는 최대 200 dpi(약 500만 화소 제한)로 렌더링한 이미지에 실제 OCR을 수행합니다. 이미지 방향 정보를 반영하고 최대 3000 × 3000으로 축소합니다. 표 선을 제거한 이미지로 문자를 인식하고, 원본 선 구조로 표를 구분합니다. 표가 검출되지 않아도 인식된 텍스트를 제공합니다. 암호 PDF는 해제 후 올리세요.

## 자료와 결과 구분

- 기본 과제 입력·출력은 기존 폴더를 사용합니다.
- 업로드 원본과 결과는 `프로그램 파일/uploads/<작업ID>/`에 별도 보관합니다. Git 업로드와 제출 ZIP에서는 제외합니다.
- 업로드 자료에는 수동 교정값이 없으므로 교정 표 탭을 비활성화합니다.
- 업로드 작업 목록은 서버 메모리에 유지되므로 재시작 후에는 파일을 다시 업로드해야 합니다. 디스크의 이전 업로드 폴더는 자동 삭제하지 않습니다.
- 유선 표 중심의 휴리스틱입니다. 무선 표·병합 셀·다단 문서·흐린 글자는 원본 대조가 필요합니다.

[업로드 실제 검증 기록](참고자료/UPLOAD_VALIDATION.json) · [기본 웹 검증](참고자료/WEB_VALIDATION.json)
