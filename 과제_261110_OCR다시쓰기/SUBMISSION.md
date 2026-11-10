# 과제 제출 안내

[README](README.md) · [실행 코드](프로그램%20파일/) · [결과 폴더](참고자료/outputs/) · [PDF 보고서](OCR_Assignment_Report.pdf) · [최종 제출 ZIP](OCR_Assignment_Final.zip)


[웹 실행 안내](WEB_USAGE.md) · [웹 서버](프로그램%20파일/web_app.py) · [웹 화면](참고자료/web-preview.png)

## 제출 순서

1. [GitHub 과제 폴더](https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/과제_261110_OCR다시쓰기)를 열어 보고서·실행 코드·결과 링크를 확인합니다.
2. 강의 사이트가 링크 제출 방식이면 아래 주소를 입력합니다.
3. 파일 제출 방식이면 위 ZIP과 PDF를 첨부합니다.
4. 채점자가 저장소에 접근할 수 있는지 확인하고 강의 사이트에서 제출을 완료합니다.

```text
https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/과제_261110_OCR다시쓰기
```

## 제출란에 붙여 넣을 설명

선택과제 B: 오래된 표 이미지의 OCR 및 텍스트·표 구조 추출

미국 인구조사국 1910 Census의 표 이미지에서 PaddleOCR로 글자와 좌표를 추출하고, 이미지 구분선과 OCR 좌표를 이용해 표 제목·각주와 11행 × 3열 표를 분리했습니다. 자동 추출 결과와 원본 대조 후 교정 결과를 별도로 보존했습니다. 왼쪽 INPUT·오른쪽 OUTPUT 웹 화면에서 추출과 결과 확인이 가능합니다. 보고서, 웹 실행 코드, 원문과 입력 이미지, OCR 원시 결과, 구조 추출 결과, 셀 검토 기록 및 최종 ZIP을 README 링크에서 확인할 수 있습니다.

## 결과와 근거

- [텍스트·표 구분 이미지](참고자료/outputs/layout/layout_regions.png)
- [분리된 제목·각주](참고자료/outputs/layout/text.txt)
- [자동 추출 표](참고자료/outputs/layout/table_001.md)
- [교정 표와 해설](참고자료/outputs/ocr/document.md)
- [33개 셀 검토 기록](참고자료/outputs/ocr/review_log.csv)
- [검증 기록](참고자료/VALIDATION.txt)

자동 구조 추출은 포함된 단일 유선 표에 맞춘 방식이며 교정 단계는 수동 검토값을 사용합니다. 전체 페이지 레이아웃 인식이나 범용 표 추출 모델을 실행한 것으로 설명하지 않습니다. 이번 점검에서 전체 OCR 추론과 새 환경 설치는 재실행하지 않았습니다.

## 추가 기능: 외부 자료 OCR
기본 화면은 항상 과제 제출 자료입니다. 다른 PDF·이미지를 업로드하면 Tesseract 한국어·영어 OCR을 실제 실행합니다. PDF 페이지별 결과, 표·텍스트·좌표 다운로드를 제공하며 업로드는 기본 과제 자료와 분리합니다. [사용 안내](WEB_USAGE.md) · [실제 OCR 검증](참고자료/UPLOAD_VALIDATION.json)

## 최종 보고서 구성
[최종 PDF 10쪽](OCR_Assignment_Report.pdf)과 [보고서 원문](REPORT.md)에 기본 과제 처리, 웹 INPUT/OUTPUT, PDF·이미지 업로드 OCR, 실제 검증 결과와 실행·제출 방법을 반영했습니다. [최종 ZIP](OCR_Assignment_Final.zip)에는 이 보고서와 현재 웹 코드를 포함합니다.
