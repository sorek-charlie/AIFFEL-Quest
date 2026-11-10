# Windows EXE 사용 안내

[README](README.md) · [Windows 실행파일](프로그램%20파일/OCR_Assignment.exe) · [전체 제출 ZIP](OCR_Assignment_Final.zip) · [GUI 원본](프로그램%20파일/ocr_app.py) · [빌드 코드](프로그램%20파일/build_exe.py)

## 실행

1. 최종 ZIP을 전체 압축 해제합니다.
2. `프로그램 파일/OCR_Assignment.exe`를 더블클릭합니다.
3. **텍스트·표 추출 실행** 버튼을 누릅니다.
4. **분리된 텍스트 / 자동 추출 표 / 교정한 표 / 실행 기록** 탭을 확인합니다.
5. 결과 폴더, 영역 구분 이미지와 PDF 보고서는 상단 버튼으로 엽니다.

Windows x64용이며 EXE 크기는 **68,825,070바이트 (약 68.8MB / 65.64MiB)**입니다. Python이나 BAT가 필요하지 않습니다. EXE 옆의 `input/`, `reviewed_cells.json`과 상위 `참고자료/`를 유지하세요. 처음 실행할 때 내부 런타임을 임시 폴더에 풀기 때문에 창이 나타나기까지 시간이 걸릴 수 있습니다.

## 기능과 범위

- 포함된 이미지와 **기존 OCR 좌표**를 읽어 제목·각주와 표를 분리합니다.
- 자동 11행 × 3열 표, 텍스트 3개, 좌표 JSON과 시각화를 다시 생성합니다.
- 수동 검토값을 별도 입력으로 사용해 교정된 CSV·문서와 검토 로그를 다시 생성합니다.
- 결과는 `참고자료/outputs/layout/`과 `참고자료/outputs/ocr/`에 저장합니다. 같은 이름의 생성 결과는 갱신합니다. 원시 OCR JSON과 좌표는 수정하지 않습니다.
- 새 이미지에 대한 OCR 모델 추론·모델 다운로드·PDF 변환은 EXE에 포함되지 않습니다. 해당 작업은 [run_ocr.py](프로그램%20파일/run_ocr.py), [prepare_input.py](프로그램%20파일/prepare_input.py)를 README의 Python 환경에서 실행합니다.

## EXE 다시 만들기

Windows에서 `프로그램 파일` 폴더로 이동해 실행합니다.

```powershell
python -m pip install -r requirements-build.txt
python build_exe.py
```

[빌드 의존성](프로그램%20파일/requirements-build.txt)은 기존 OCR 추론용 requirements.txt와 구분합니다. PyInstaller로 Python·Tkinter·OpenCV·NumPy·Pillow와 구조 추출 코드를 묶습니다. EXE에는 입력 자료를 숨겨 넣지 않고 폴더의 파일을 읽도록 했습니다.

## 실행 검증

EXE의 실제 실행으로 자동 표 크기·텍스트 블록 수, 교정 표 생성과 GUI 구성을 검증합니다. 검증 결과는 [EXE 검증 기록](참고자료/EXE_VALIDATION.json)을 확인하세요.
