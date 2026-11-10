# 공개 브라우저 OCR 웹

Tesseract.js 7.0.0과 PDF.js 6.5.438로 PDF·이미지를 브라우저 안에서 처리합니다. 기본 입력은 과제 제출 자료입니다. 방문자 파일은 서버로 업로드하지 않습니다.

## 빌드

```text
npm ci
npm run build
```

정적 배포 디렉터리는 dist입니다. 언어·OCR Worker·WASM·PDF 라이브러리를 사이트 자체에서 제공합니다. 공개 버전은 기본 과제의 저장된 결과를 표시하고, 업로드 자료에 새 OCR을 실행합니다. 로컬 Python 버전의 결과와 모델 버전·전처리가 달라 인식값은 차이가 날 수 있습니다.

PDF·PNG·JPG·WEBP·BMP, 한국어·영어, 최대 30MB·PDF 50쪽을 지원합니다. 표는 선 구조 기반의 휴리스틱입니다. 무선 표·병합 셀은 수동 검토가 필요합니다. 결과는 다운로드해야 보관되며 새로고침하면 기본 과제로 돌아옵니다.

## 오픈소스

- Tesseract.js / Tesseract.js-core: Apache-2.0, https://github.com/naptha/tesseract.js
- PDF.js: Apache-2.0, https://github.com/mozilla/pdf.js
- 언어 데이터: @tesseract.js-data/eng, @tesseract.js-data/kor (4.0.0_best_int)

배포물 vendor/licenses에 라이브러리 라이선스를 함께 제공합니다.
