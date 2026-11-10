"""Build the final Korean PDF report from the included extraction artifacts."""
from pathlib import Path
import csv
import json
from html import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / '참고자료'
OUT = REF / 'outputs'


def build():
    # Install a Korean TrueType font or adapt these paths on other platforms.
    regular = Path('C:/Windows/Fonts/malgun.ttf')
    bold = Path('C:/Windows/Fonts/malgunbd.ttf')
    if not regular.exists():
        raise RuntimeError('Set regular/bold Korean TTF font paths in build_report.py before building on this OS.')
    pdfmetrics.registerFont(TTFont('Korean', str(regular)))
    pdfmetrics.registerFont(TTFont('KoreanBold', str(bold)))
    body = ParagraphStyle('Body', fontName='Korean', fontSize=10, leading=16,
                          wordWrap='CJK', spaceAfter=9, textColor=colors.HexColor('#253349'))
    heading = ParagraphStyle('Heading', parent=body, fontName='KoreanBold', fontSize=19, leading=27, spaceAfter=18)
    sub = ParagraphStyle('Sub', parent=body, fontName='KoreanBold', fontSize=12, leading=18, spaceBefore=10)
    small = ParagraphStyle('Small', parent=body, fontSize=8, leading=12, spaceAfter=0)
    header = ParagraphStyle('Header', parent=small, fontName='KoreanBold', textColor=colors.white)
    story = []
    notes = ['# 선택과제 B | OCR 텍스트와 표 구조 추출', '', '최종 수정: 2026-11-10', '']

    def paragraph(text, style=body):
        story.append(Paragraph(escape(text), style))
        prefix = '## ' if style is heading else ('### ' if style is sub else '')
        notes.extend([prefix + text, ''])

    def section(title):
        if story:
            story.append(PageBreak())
        paragraph(title, heading)

    def figure(path, caption, width=490):
        from PIL import Image as PILImage
        with PILImage.open(path) as im:
            height = width * im.height / im.width
        story.append(Image(str(path), width=width, height=height))
        notes.extend(['![' + caption + '](' + path.relative_to(ROOT).as_posix().replace(' ', '%20') + ')', ''])
        story.append(Spacer(1, 8))
        paragraph(caption, small)
        story.append(Spacer(1, 12))

    def table(headers, rows, widths, font=small):
        data = [[Paragraph(escape(str(x)), header) for x in headers]]
        data.extend([[Paragraph(escape(str(x)), font) for x in row] for row in rows])
        t = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#244b70')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0f5fa'), colors.white]),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
            ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LINEBELOW', (0, 0), (-1, 0), .7, colors.HexColor('#244b70')),
            ('LINEBELOW', (0, 1), (-1, -1), .3, colors.HexColor('#d7e1ec')),
        ]))
        story.append(t)
        notes.append('| ' + ' | '.join(headers) + ' |')
        notes.append('|' + '|'.join(['---'] * len(headers)) + '|')
        notes.extend('| ' + ' | '.join(str(x) for x in row) + ' |' for row in rows)
        notes.append('')

    layout = json.loads((OUT / 'layout/layout.json').read_text(encoding='utf-8'))
    automatic = layout['tables'][0]
    final = list(csv.DictReader((OUT / 'ocr/table.csv').open(encoding='utf-8-sig', newline='')))

    section('01 | 과제 목적과 입력 자료')
    paragraph('일반 OCR로 얻은 문자열을 텍스트와 표로 구분하고, 표의 행·열 구조를 복원하여 검색·복사가 가능한 문서를 만든다. 웹에서 기본 과제를 확인하고 다른 PDF·이미지를 업로드해 실제 OCR을 수행한다. 자동 추출 결과와 원본 대조 후 교정 결과를 별도로 보존한다.')
    paragraph('자료: 미국 인구조사국 1910 Census Volume I(1913), PDF 2쪽 / 인쇄 22쪽 Table 1. 원문을 200 dpi로 렌더링한 뒤 [675, 785, 1760, 1290] 영역을 잘랐다. 입력은 1085 × 505 픽셀이다.')
    figure(ROOT / '프로그램 파일/input/census-table.png', '그림 1. 입력 이미지. 표의 세 열과 11개 데이터 행, 표 제목과 두 각주를 포함한다.')
    paragraph('처리 범위는 포함된 단일 표 이미지다. 원문 페이지의 주변 본문과 다른 표는 입력에 포함되지 않는다. 따라서 전체 페이지 본문 레이아웃 분석을 완료했다고 주장하지 않는다.')
    paragraph('출처: https://www2.census.gov/library/publications/decennial/1910/volume-1/volume-1-p3.pdf', small)

    section('02 | OCR에서 텍스트·표 분리까지')
    paragraph('기존 처리의 문제: run_ocr.py는 글자와 위치를 인식했지만 행·열 구조를 계산하지 않았다. reconstruct_table.py는 사람이 작성한 reviewed_cells.json을 읽어 교정 표를 만들었다. OCR 문자열 추출만으로는 텍스트와 표가 구분되지 않는다.')
    table(['단계', '실행 파일', '입력과 결과'], [
        ['1. 문자 인식', 'run_ocr.py', '입력 이미지 → 42개 OCR 영역, 문자열, 점수, 좌표'],
        ['2. 구조 추출', 'extract_layout.py', '이미지 구분선 + OCR 좌표 → 텍스트 블록과 11행 × 3열 표'],
        ['3. 의미 교정', 'reconstruct_table.py', '수동 검토값 + 원시 좌표 → 교정 CSV, 문서, 검토 기록'],
    ], [78, 120, 297])
    story.append(Spacer(1, 14))
    paragraph('구조 추출 방식', sub)
    paragraph('OpenCV로 이진화한 이미지에 모폴로지 연산을 적용해 긴 수직·수평선을 검출한다. 외곽선, 열 경계, 머리글 구분선을 찾고, 첫 열의 OCR 중심 좌표로 데이터 행을 구성한다. 다른 열의 영역은 가장 가까운 행 중심에 배치한다.')
    paragraph('첫 열 상단 모서리의 제목과 표 바깥 각주는 별도 텍스트 블록으로 저장한다. 이 단계는 reviewed_cells.json을 읽지 않으며 OCR 문자열을 자동 교정하지 않는다.')
    paragraph('최초 OCR 환경: Linux x86_64 / Python 3.12.14 / CPU. PaddleOCR 3.7.0, PaddlePaddle 3.3.1, PaddleX 3.7.2. PP-OCRv4_mobile_det + en_PP-OCRv4_mobile_rec 사용. 보정 모듈 비활성화, enable_mkldnn=False. 기존 manifest와 실행 로그를 보존했다.')

    section('03 | 텍스트와 표의 영역 구분 결과')
    figure(OUT / 'layout/layout_regions.png', '그림 2. 초록색은 표 외곽과 열·행 구분, 파란색은 별도로 분리한 제목과 각주다.')
    paragraph('결과: 표 1개, 본문 11행 × 3열, 별도 텍스트 블록 3개. 본문 OCR 영역 33개(잡음 1개 포함)를 셀에 중복 없이 배치했다. 제목·각주 영역은 표 데이터에 넣지 않았다.')
    table(['분류', '원시 OCR 문자열', '설명'], [
        ['표 제목', layout['text_blocks'][0]['text'], '원문은 Table 1. OCR 오독은 유지'],
        ['각주 1', layout['text_blocks'][1]['text'], '필리핀 인구는 1903년'],
        ['각주 2', layout['text_blocks'][2]['text'], '파나마 인구는 1912년. 각주 번호 누락 유지'],
    ], [60, 225, 210])
    story.append(Spacer(1, 10))
    paragraph('outputs/layout/text.txt는 표 외 텍스트를, layout.json은 텍스트·표 블록과 경계 및 셀별 OCR id를 저장한다. table_001.csv / .md / .html은 표 구조를, document.md는 제목 → 표 → 각주 순서를 기록한다.')

    section('04 | 자동 추출한 표: 교정 전')
    paragraph('아래 값은 OCR 출력 그대로다. 표 구조를 자동으로 배치한 것과 글자의 정확성을 구분하기 위해 수동 교정값을 섞지 않았다. 행·열 구조는 복원되었지만 머리글과 숫자에 문자 인식 오류가 남아 있다.')
    table(automatic['headers'], automatic['rows'], [265, 105, 125])
    story.append(Spacer(1, 12))
    paragraph('확인 예: 인구 열 연도는 1010으로 오독했다. Philippine Islands의 17,635,426과 Panama Canal Zone의 262,810에는 각주 번호가 붙어 있다. Military and naval service abroad의 면적은 OCR 값이 없으며 빈 셀을 유지한다.')

    section('05 | 원본 대조 후 교정한 표')
    paragraph('수동 검토 단계에서 숫자의 쉼표·공백을 정리하고, 인구에 붙은 각주 번호를 분리했다. CSV는 area, gross_area_sq_miles, population, population_year, notes의 다섯 열로 저장한다. 아래 표는 notes를 제외한 요약이다.')
    rows = [[x['area'], f"{int(x['gross_area_sq_miles']):,}" if x['gross_area_sq_miles'] else '빈 값',
             f"{int(x['population']):,}", x['population_year']] for x in final]
    table(['Area', 'Area (sq mi)', 'Population', 'Year'], rows, [245, 90, 100, 60])
    story.append(Spacer(1, 12))
    paragraph('빈 면적은 원문 미기재이며 0이 아니다. 필리핀 인구는 1903년, 파나마 인구는 1912년이다. Guam과 Samoa는 추정치이며 notes에 보존한다. 역사적 표기 Porto Rico를 유지한다.')
    paragraph('전체·소계·구성 행이 함께 있으므로 11행을 단순 합산하면 중복 집계된다. 통계의 역사적 정확성 자체를 검증한 것은 아니다.')

    section('06 | 오류 수정 근거와 검증 범위')
    table(['위치', '원시 OCR', '교정 후'], [
        ['표 제목 / 첫 열 제목', 'able1 / ARDA.', 'Table 1 / AREA.'],
        ['인구 열 연도', '1010 (점수 약 0.9711)', '1910'],
        ['Porto Rico 인구', '1, 118, 01.2', '1,118,012'],
        ['Philippine Islands', '17,635,426', '7,635,426 / 1903년'],
        ['Panama Canal Zone', '262,810', '62,810 / 1912년'],
        ['해외 군인 면적', '인식된 숫자 없음', '빈 값 유지'],
    ], [145, 170, 180])
    story.append(Spacer(1, 14))
    paragraph('현재 Windows PC에서 확인한 내용', sub)
    paragraph('구조 추출과 교정 표 재생성을 실행했다. 11행 × 3열, 별도 텍스트 3개, OCR id 중복 배치 없음, 표 본문과 제목·각주의 분리, 빈 면적 유지, 교정 전 OCR 오독 보존을 확인했다. 11행 교정값과 33개 셀 검토 로그, 입력 SHA256도 점검했다.')
    paragraph('기본 과제의 전체 PaddleOCR 추론과 새 가상환경 설치는 이번 점검에서 재실행하지 않았다. 외부 업로드 자료는 Tesseract로 새 OCR을 실행해 검증했으며 9절에 구분해 기록한다. 포함된 42개 OCR 영역은 기존 실행 결과이며, 새 구조 추출 단계가 이를 입력으로 사용한다. review_log.csv와 corrections.csv는 원시값과 교정 근거를 연결한다.')
    paragraph('알고리즘 한계', sub)
    paragraph('기본 과제용 extract_layout.py는 단일 유선 표에 맞춘 휴리스틱이다. 무선 표, 병합 셀, 여러 표와 여러 줄 행 제목을 일반적으로 지원하지 않는다. 제목 분류는 위치 규칙이며 범용 레이아웃 모델이 아니다. 다른 문서나 전체 페이지를 처리하려면 OCR 범위 확대와 별도 레이아웃 검출이 필요하다.')

    section('07 | 웹 실행: 기본 과제와 INPUT / OUTPUT')
    paragraph('웹 주소는 http://127.0.0.1:8501 이다. 처음 접속하거나 새로고침하면 항상 과제 제출 자료가 기본으로 선택된다. 기존 과제의 원본 이미지와 저장된 결과를 즉시 표시한다.')
    figure(REF / 'web-preview.png', '그림 3. 기본 웹 화면. 왼쪽 INPUT은 과제 이미지와 추출 버튼, 오른쪽 OUTPUT은 텍스트·표와 다운로드다.', width=465)
    paragraph('왼쪽 INPUT에서 입력 자료와 원본을 확인하고 텍스트·표 추출을 실행한다. 오른쪽 OUTPUT에서 자동 추출 표, 텍스트, 교정 표, 영역 보기, 원시 OCR 탭을 전환한다. CSV·텍스트·JSON 다운로드와 PDF 보고서 열기를 제공한다.')
    paragraph('기본 과제의 추출 버튼은 기존 PaddleOCR 좌표와 이미지 구분선을 사용해 11행 × 3열과 텍스트 3개를 재생성한다. 교정 표는 별도의 수동 검토값을 이용한다. 기본 과제의 저장 결과를 새 OCR 모델 추론 결과로 설명하지 않는다.')
    paragraph('웹 서버는 현재 PC의 127.0.0.1에만 연결된다. GitHub는 코드·보고서·결과를 제공하며 Python 서버를 실행하지 않는다. 다른 PC에서는 저장소를 내려받아 웹 서버를 실행해야 한다.')

    section('08 | PDF·이미지 업로드 OCR')
    paragraph('입력 자료에서 다른 PDF·이미지 업로드를 선택하고 파일과 언어를 지정한다. 한국어+영어, 영어, 한국어를 지원한다. 기본 과제와 다른 자료는 Tesseract로 실제 문자 인식을 수행한다.')
    figure(REF / 'web-upload-preview.png', '그림 4. 스캔 PDF 2쪽의 OCR 완료 화면. 왼쪽 업로드·언어 설정, 오른쪽 페이지 선택과 표 결과를 확인한다.', width=455)
    paragraph('PDF는 페이지별로 렌더링한 뒤 OCR한다. 처리 중 완료 페이지 수를 표시하고, 완료 후 페이지 선택으로 원본·텍스트·표·영역을 함께 바꾼다. 페이지별 표 CSV, 전체 인식 텍스트, 좌표 JSON을 내려받을 수 있다.')
    paragraph('업로드 자료에는 과제의 수동 교정값을 적용하지 않는다. 교정 표 탭을 비활성화하고 실제 자동 인식값을 보여 준다. 표가 검출되지 않아도 인식한 텍스트를 제공한다.')
    paragraph('업로드 한도: 파일 30MB, PDF 50쪽. PNG/JPG/WEBP/BMP/TIFF를 지원한다. 암호 PDF는 해제 후 업로드한다.', small)

    section('09 | 업로드 처리 과정·실제 검증·한계')
    table(['단계', '처리 내용'], [
        ['입력 준비', 'PDF는 최대 200 dpi 및 약 500만 화소로 렌더링. 이미지 방향 정보를 반영하고 최대 3000 × 3000으로 축소.'],
        ['글자 인식', '긴 표 선을 제거한 이미지에 Tesseract kor+eng OCR 실행. 문자열, 신뢰도, 단어 좌표를 저장.'],
        ['표·텍스트 구분', '원본의 수직·수평선을 검출하고 유선 표 경계·열과 OCR 좌표를 연결. 표 밖의 단어는 텍스트로 분리.'],
        ['자료 분리', 'uploads/<작업ID>에 원본·페이지 이미지·OCR 결과를 보관. 기본 과제 원본·출력은 유지. Git과 ZIP에서 업로드 제외.'],
    ], [100, 395])
    story.append(Spacer(1, 12))
    paragraph('실제 검증 결과', sub)
    evidence = json.loads((REF / 'UPLOAD_VALIDATION.json').read_text(encoding='utf-8'))
    table(['검증 입력·동작', '확인 결과'], [
        ['PNG 이미지', str(evidence['upload-test.png']['pages']) + '쪽 실제 OCR 완료. 한국어·영어·숫자 인식, 표 1개 확인.'],
        ['2쪽 스캔 PDF', str(evidence['scan-test.pdf']['pages']) + '쪽 모두 OCR 완료. 각 페이지 표 1개와 한국어·영어 인식 확인.'],
        ['브라우저 조작', '실제 파일 선택 → OCR 실행 → 2쪽 선택 → CSV HTTP 200 확인.'],
        ['기본 과제 보존', '입력 이미지·기본 표·레이아웃 파일 SHA256 유지. 기본 모드 복귀 및 새로고침 시 11행 표 확인.'],
    ], [125, 370])
    story.append(Spacer(1, 10))
    paragraph('한계: 업로드 표 추출은 유선 표 중심의 휴리스틱이다. 무선 표, 병합 셀, 복잡한 다단 문서와 흐린 글자는 원본 검토가 필요하다. 열 이름을 확정할 수 없을 때 일반 열 번호를 사용하며 OCR 오독을 자동 확정값으로 교정하지 않는다. 사용자 업로드 작업 목록은 서버 재시작 시 초기화되며 디스크 파일은 자동 삭제하지 않는다.')

    section('10 | 웹 실행 방법·제출 파일')
    paragraph('프로그램 파일 폴더에서 아래 명령을 실행한다. Python 패키지와 별도로 업로드 OCR용 Tesseract 실행 프로그램 및 kor/eng 언어 데이터가 필요하다. 현재 PC에는 설치되어 있으며 설치·환경변수 설정은 WEB_USAGE.md에 기록했다.')
    table(['작업', '명령·위치'], [
        ['웹 의존성 설치', 'python -m pip install -r requirements-web.txt'],
        ['웹 실행', 'python web_app.py'],
        ['접속 주소', 'http://127.0.0.1:8501'],
        ['언어 확인', 'tesseract --list-langs (kor, eng 확인)'],
        ['웹 종료', '서버 터미널에서 Ctrl+C'],
        ['보고서 재생성', 'requirements-report.txt 설치 후 python build_report.py'],
    ], [130, 365])
    story.append(Spacer(1, 12))
    paragraph('프로그램 파일/: web_app.py, upload_ocr.py, web/index.html, requirements-web.txt와 기존 OCR·복원 코드, 입력 이미지. 참고자료/: 공식 원문, OCR·레이아웃 결과, 검증 JSON과 웹 화면 이미지. 업로드 파일은 제출물에 포함하지 않는다.')
    paragraph('README.md는 소개·실행·결과·제출 링크와 로컬↔GitHub 경로 대응을 제공한다. WEB_USAGE.md는 웹·업로드 설치와 사용법, SUBMISSION.md는 제출 순서와 설명문이다. PDF와 REPORT.md는 같은 생성 코드로 작성한다.')
    paragraph('최종 ZIP은 프로그램 파일, 참고자료, README, 사용·제출 안내와 보고서를 묶는다. ZIP 자기 자신, .git, 가상환경·캐시, 사용자 uploads 폴더는 제외한다. 최상위 제출파일 폴더의 ZIP·PDF는 동일한 제출용 복사본이다.')
    paragraph('과제 제출용 GitHub 폴더', sub)
    paragraph('https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/과제_261110_OCR다시쓰기', small)
    paragraph('강의 제출란에는 위 폴더 링크를 입력하고, 파일 첨부 방식이면 최종 ZIP과 PDF를 첨부한다. 강의 사이트 제출 버튼은 이번 작업에서 누르지 않았다. 기존 과제 요구사항의 출처는 강의자료 8~10쪽이며 해당 강의 원본은 현재 폴더에 없다.')

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#d7e1ec'))
        canvas.line(50, 43, 545, 43)
        canvas.setFont('Korean', 8)
        canvas.setFillColor(colors.HexColor('#58718c'))
        canvas.drawString(50, 29, '선택과제 B | OCR 텍스트와 표 구조 추출 | 2026-11-10')
        canvas.drawRightString(545, 29, str(doc.page))
        canvas.restoreState()

    document = SimpleDocTemplate(str(ROOT / 'OCR_Assignment_Report.pdf'), pagesize=A4,
                                leftMargin=50, rightMargin=50, topMargin=45, bottomMargin=58,
                                title='선택과제 B - OCR 텍스트와 표 구조 추출', author='AIFFEL 과제')
    document.build(story, onFirstPage=footer, onLaterPages=footer)
    (ROOT / 'REPORT.md').write_text('\n'.join(notes), encoding='utf-8')
    print('Generated final PDF and REPORT.md')


if __name__ == '__main__':
    build()
