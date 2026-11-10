# 선택과제 B | OCR 텍스트와 표 구조 추출

최종 수정: 2026-11-10

01 | 과제 목적과 입력 자료

일반 OCR로 얻은 문자열을 텍스트와 표로 구분하고, 표의 행·열 구조를 복원하여 검색·복사가 가능한 문서를 만든다. 자동 추출 결과와 원본 대조 후 교정 결과를 별도로 보존한다.

자료: 미국 인구조사국 1910 Census Volume I(1913), PDF 2쪽 / 인쇄 22쪽 Table 1. 원문을 200 dpi로 렌더링한 뒤 [675, 785, 1760, 1290] 영역을 잘랐다. 입력은 1085 × 505 픽셀이다.

그림 1. 입력 이미지. 표의 세 열과 11개 데이터 행, 표 제목과 두 각주를 포함한다.

처리 범위는 포함된 단일 표 이미지다. 원문 페이지의 주변 본문과 다른 표는 입력에 포함되지 않는다. 따라서 전체 페이지 본문 레이아웃 분석을 완료했다고 주장하지 않는다.

출처: https://www2.census.gov/library/publications/decennial/1910/volume-1/volume-1-p3.pdf

02 | OCR에서 텍스트·표 분리까지

기존 처리의 문제: run_ocr.py는 글자와 위치를 인식했지만 행·열 구조를 계산하지 않았다. reconstruct_table.py는 사람이 작성한 reviewed_cells.json을 읽어 교정 표를 만들었다. OCR 문자열 추출만으로는 텍스트와 표가 구분되지 않는다.

| 단계 | 실행 파일 | 입력과 결과 |
|---|---|---|
| 1. 문자 인식 | run_ocr.py | 입력 이미지 → 42개 OCR 영역, 문자열, 점수, 좌표 |
| 2. 구조 추출 | extract_layout.py | 이미지 구분선 + OCR 좌표 → 텍스트 블록과 11행 × 3열 표 |
| 3. 의미 교정 | reconstruct_table.py | 수동 검토값 + 원시 좌표 → 교정 CSV, 문서, 검토 기록 |

구조 추출 방식

OpenCV로 이진화한 이미지에 모폴로지 연산을 적용해 긴 수직·수평선을 검출한다. 외곽선, 열 경계, 머리글 구분선을 찾고, 첫 열의 OCR 중심 좌표로 데이터 행을 구성한다. 다른 열의 영역은 가장 가까운 행 중심에 배치한다.

첫 열 상단 모서리의 제목과 표 바깥 각주는 별도 텍스트 블록으로 저장한다. 이 단계는 reviewed_cells.json을 읽지 않으며 OCR 문자열을 자동 교정하지 않는다.

최초 OCR 환경: Linux x86_64 / Python 3.12.14 / CPU. PaddleOCR 3.7.0, PaddlePaddle 3.3.1, PaddleX 3.7.2. PP-OCRv4_mobile_det + en_PP-OCRv4_mobile_rec 사용. 보정 모듈 비활성화, enable_mkldnn=False. 기존 manifest와 실행 로그를 보존했다.

03 | 텍스트와 표의 영역 구분 결과

그림 2. 초록색은 표 외곽과 열·행 구분, 파란색은 별도로 분리한 제목과 각주다.

결과: 표 1개, 본문 11행 × 3열, 별도 텍스트 블록 3개. 본문 OCR 영역 33개(잡음 1개 포함)를 셀에 중복 없이 배치했다. 제목·각주 영역은 표 데이터에 넣지 않았다.

| 분류 | 원시 OCR 문자열 | 설명 |
|---|---|---|
| 표 제목 | able1 | 원문은 Table 1. OCR 오독은 유지 |
| 각주 1 | 1 Population in 1903. | 필리핀 인구는 1903년 |
| 각주 2 |  Population in 1912. | 파나마 인구는 1912년. 각주 번호 누락 유지 |

outputs/layout/text.txt는 표 외 텍스트를, layout.json은 텍스트·표 블록과 경계 및 셀별 OCR id를 저장한다. table_001.csv / .md / .html은 표 구조를, document.md는 제목 → 표 → 각주 순서를 기록한다.

04 | 자동 추출한 표: 교정 전

아래 값은 OCR 출력 그대로다. 표 구조를 자동으로 배치한 것과 글자의 정확성을 구분하기 위해 수동 교정값을 섞지 않았다. 행·열 구조는 복원되었지만 머리글과 숫자에 문자 인식 오류가 남아 있다.

| ARDA. | Gross area land and water) in square miles. | Population: 1010 |
|---|---|---|
| United States, with outlying possessions. | 3, 743, 306 | 101, 115, 487 |
| United States, exclusive of outlying possessions - | 3, 026, 789 | 91, 972, 266 |
| Outlying possessions.. | 716, 517 | 9, 143, 221 |
| Alaska. | 590, 884. | 64, 356 |
| Hawaii. | 6, 449 | 191, 909 |
| Porto Rico. | 3, 435 | 1, 118, 01.2 |
| Military and naval service abroad. |  | 55,608 |
| Philippine Islands. | 115, 026 | 17,635,426 |
| Panama Canal Zone. | 436 | 262,810 |
| Guam (population estimated) | 210 | 9, 000 |
| Samoa (population estimated) | 77 | 6, 100 |

확인 예: 인구 열 연도는 1010으로 오독했다. Philippine Islands의 17,635,426과 Panama Canal Zone의 262,810에는 각주 번호가 붙어 있다. Military and naval service abroad의 면적은 OCR 값이 없으며 빈 셀을 유지한다.

05 | 원본 대조 후 교정한 표

수동 검토 단계에서 숫자의 쉼표·공백을 정리하고, 인구에 붙은 각주 번호를 분리했다. CSV는 area, gross_area_sq_miles, population, population_year, notes의 다섯 열로 저장한다. 아래 표는 notes를 제외한 요약이다.

| Area | Area (sq mi) | Population | Year |
|---|---|---|---|
| United States, with outlying possessions | 3,743,306 | 101,115,487 | 1910 |
| United States, exclusive of outlying possessions | 3,026,789 | 91,972,266 | 1910 |
| Outlying possessions | 716,517 | 9,143,221 | 1910 |
| Alaska | 590,884 | 64,356 | 1910 |
| Hawaii | 6,449 | 191,909 | 1910 |
| Porto Rico | 3,435 | 1,118,012 | 1910 |
| Military and naval service abroad | 빈 값 | 55,608 | 1910 |
| Philippine Islands | 115,026 | 7,635,426 | 1903 |
| Panama Canal Zone | 436 | 62,810 | 1912 |
| Guam (population estimated) | 210 | 9,000 | 1910 |
| Samoa (population estimated) | 77 | 6,100 | 1910 |

빈 면적은 원문 미기재이며 0이 아니다. 필리핀 인구는 1903년, 파나마 인구는 1912년이다. Guam과 Samoa는 추정치이며 notes에 보존한다. 역사적 표기 Porto Rico를 유지한다.

전체·소계·구성 행이 함께 있으므로 11행을 단순 합산하면 중복 집계된다. 통계의 역사적 정확성 자체를 검증한 것은 아니다.

06 | 오류 수정 근거와 검증 범위

| 위치 | 원시 OCR | 교정 후 |
|---|---|---|
| 표 제목 / 첫 열 제목 | able1 / ARDA. | Table 1 / AREA. |
| 인구 열 연도 | 1010 (점수 약 0.9711) | 1910 |
| Porto Rico 인구 | 1, 118, 01.2 | 1,118,012 |
| Philippine Islands | 17,635,426 | 7,635,426 / 1903년 |
| Panama Canal Zone | 262,810 | 62,810 / 1912년 |
| 해외 군인 면적 | 인식된 숫자 없음 | 빈 값 유지 |

현재 Windows PC에서 확인한 내용

구조 추출과 교정 표 재생성을 실행했다. 11행 × 3열, 별도 텍스트 3개, OCR id 중복 배치 없음, 표 본문과 제목·각주의 분리, 빈 면적 유지, 교정 전 OCR 오독 보존을 확인했다. 11행 교정값과 33개 셀 검토 로그, 입력 SHA256도 점검했다.

전체 OCR 추론과 새 가상환경 설치는 이번 점검에서 재실행하지 않았다. 포함된 42개 OCR 영역은 기존 실행 결과이며, 새 구조 추출 단계가 이를 입력으로 사용한다. review_log.csv와 corrections.csv는 원시값과 교정 근거를 연결한다.

알고리즘 한계

단일 유선 표에 맞춘 휴리스틱이다. 무선 표, 병합 셀, 여러 표와 여러 줄 행 제목을 일반적으로 지원하지 않는다. 제목 분류는 위치 규칙이며 범용 레이아웃 모델이 아니다. 다른 문서나 전체 페이지를 처리하려면 OCR 범위 확대와 별도 레이아웃 검출이 필요하다.

07 | 실행 방법·파일 구성·제출

프로그램 파일 폴더: run_ocr.py, extract_layout.py, reconstruct_table.py, prepare_input.py, reviewed_cells.json, requirements.txt 및 입력 이미지. 참고자료 폴더: 공식 원문 PDF, OCR·레이아웃 결과, 교정 표, 로그와 환경 기록.

프로그램 파일 폴더에서 Python 3.12 가상환경을 만들고 활성화한 다음 실행한다. 입력 이미지는 포함되어 있어 PDF 재변환은 선택 사항이다. 최초 OCR 모델 다운로드에는 인터넷이 필요하다.

| 순서 | 명령 |
|---|---|
| 설치 | python -m pip install -r requirements.txt |
| 1. OCR | python run_ocr.py |
| 2. 텍스트·표 분리 | python extract_layout.py |
| 3. 교정 표 재생성 | python reconstruct_table.py |

기존 OCR 결과로 구조 추출만 확인할 때는 numpy, opencv-python, Pillow를 설치하고 extract_layout.py를 실행하면 된다. 결과는 과제 폴더의 참고자료/outputs 아래에 저장한다.

README에서 실행 코드, 입력, 텍스트, 자동 표, 교정 표, PDF와 결과 이미지를 상대 링크로 바로 열 수 있다. GitHub에서는 Markdown 표를 바로 읽을 수 있고 HTML은 소스 파일로 열린다.

제출 위치: sorek-charlie/AIFFEL-Quest 저장소의 과제_261110_OCR다시쓰기 폴더. 최종 ZIP은 프로그램 파일, 참고자료, README와 보고서를 포함하며 ZIP 자기 자신과 Git 내부 파일은 제외한다.

GitHub 폴더 주소

https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/과제_261110_OCR다시쓰기

강의 사이트에는 이 폴더 링크를 제출한다. 강의 사이트 제출 버튼은 이번 작업 범위에서 누르지 않는다. 과제 요구사항의 출처는 기존 기록의 강의자료 8~10쪽이며 해당 강의 원본 파일은 현재 작업 폴더에 없다.
