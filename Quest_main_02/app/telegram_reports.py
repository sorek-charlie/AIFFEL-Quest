"""Report commands shared by the workroom bot and the personal bot gateway."""
import re
import tempfile
from pathlib import Path

from .report_names import finance_title, source_title

FINANCE = {'심층보고서': 'deep', '심층분석': 'deep', '종합보고서': 'comprehensive', '세무조정계산서': 'adjustment'}
WRITING = {'회의록정리': 'meeting', '회의록': 'meeting', '요약보고서': 'document', '문서요약': 'document'}
LABELS = {'brief': '간략보고서', 'deep': '심층보고서', 'comprehensive': '종합보고서',
          'adjustment': '세무조정계산서 분석보고서', 'meeting': '회의록정리', 'document': '요약보고서'}
MEDIA_LIMIT = 20_000_000


def parse_report(text, *, bare=False):
    text = ' '.join(str(text or '').strip().split())
    slash = re.fullmatch(r'/(brief|deep|comprehensive|adjustment|meeting|summary)(?:@[\w]+)?(?:\s+(.*))?', text, re.I)
    if slash:
        kind = slash[1].lower()
        return ('document' if kind == 'summary' else kind), slash[2] or ''
    for label, kind in {'간략보고서': 'brief', **FINANCE, **WRITING}.items():
        pattern = r'\s*'.join(map(re.escape, label))
        match = re.fullmatch(
            rf'(?:회사명\s*[:：]\s*)?(.*?)\s*{pattern}(?:(?:를|을)\s*)?(?:\s*(?:작성|생성|분석|정리)\s*(?:해\s*(?:줘|주세요|줘요)|부탁해요?)?)?[.!?]*',
            text,
        )
        if match:
            return kind, match[1].strip().removesuffix('의').strip()
        match = re.fullmatch(rf'{pattern}\s*[:：]?\s+(.+)', text)
        if match:
            return kind, match[1].strip()
    if bare and re.fullmatch(r'[A-Za-z가-힣0-9㈜().&+-]{2,24}', text):
        return 'bare', text
    return None


def tax_report(company, files, path, title):
    """Extract the submitted calculation's stated amounts and page references."""
    import pymupdf
    from briefings.report_pdf import create
    from .finance_input import UNITS, number

    labels = ('결산서상당기순손익', '익금산입', '손금산입', '각사업연도소득금액', '과세표준',
              '산출세액', '최저한세', '공제감면세액', '차감납부할세액', '농어촌특별세')
    candidates = {label: [] for label in labels}
    references = []
    for name, raw in files:
        if Path(name).suffix.lower() != '.pdf':
            raise ValueError('세무조정계산서는 텍스트를 읽을 수 있는 PDF를 첨부해 주세요.')
        with pymupdf.open(stream=raw, filetype='pdf') as doc:
            if doc.needs_pass or len(doc) > 150:
                raise ValueError('암호가 없고 150쪽 이하인 세무조정 PDF를 첨부해 주세요.')
            references.append(f'{name} · {len(doc)}쪽')
            for index, page in enumerate(doc, 1):
                page_text = page.get_text()
                units = set(re.findall(r'단위\s*[:：]\s*(백만원|천원|억원|원)', page_text))
                if len(units) != 1:
                    continue
                for line in page_text.splitlines():
                    compact = re.sub(r'\s+', '', line)
                    for label in labels:
                        match = re.fullmatch(re.escape(label) + r'[:：]?([+-]?[\d,]+|\([\d,]+\))', compact)
                        if match:
                            candidates[label].append((number(match[1], UNITS[next(iter(units))]), name, index))
    if not any(candidates.values()):
        raise ValueError('원문에서 금액 단위와 항목이 함께 명시된 세무조정 값을 확인하지 못했습니다.')
    lines = ['# 세무조정계산서 분석보고서', f'기업 · {company}', '첨부 계산서에 표시된 값을 원 단위로 정리했습니다.',
             '## 원문 및 범위', *references, '## 소득 조정에서 납부세액까지']
    for label, entries in candidates.items():
        if not entries:
            lines.append(f'{label} · 자료 없음')
        elif len({row[0] for row in entries}) != 1:
            lines.append(f'{label} · 복수 금액 발견, 적용 기간과 원문 확인 필요')
        else:
            value, name, page = entries[0]
            lines.append(f'{label} · {value:,}원 · {name} {page}쪽')
    lines += ['## 확인할 사항', '귀속연도, 세액 공제의 적용 요건과 이월 여부는 원문 및 담당자 확인이 필요합니다.']
    create('\n'.join(lines), path, title=title)


def execute_report(kind, subject, files=(), *, credentials, filing=None, publisher=None, provider='openai'):
    from .output_delivery import publish

    publish_report = publisher or publish
    if kind == 'brief':
        from .dart_finance import prepare
        from .finance_reports import make_brief
        prepared = prepare(subject, filing=filing)
        company = prepared['company']
        builder = make_brief
    elif kind in ('deep', 'comprehensive', 'adjustment'):
        if not files or not subject:
            raise ValueError(f'파일 설명에 회사명과 {LABELS[kind]}를 입력하고 자료를 첨부해 주세요.')
        company = subject
        if kind == 'adjustment':
            builder = None
        else:
            from .finance_input import extract_files
            from .finance_reports import make_comprehensive, make_deep
            prepared = extract_files(files)
            if any(False in row['checks'].values() for row in prepared['rows']):
                raise ValueError('원자료 합계가 일치하지 않습니다. 첨부 자료를 확인해 주세요.')
            prepared.update(company=company, input_names=[name for name, _ in files])
            builder = make_deep if kind == 'deep' else make_comprehensive
    elif kind in ('meeting', 'document'):
        from .ingest import ALLOWED, extract
        from .providers import analyze
        from briefings.report_pdf import create

        parts = [subject] if subject else []
        with tempfile.TemporaryDirectory() as folder:
            for index, (name, raw) in enumerate(files):
                ext = Path(name).suffix.lower()
                if ext not in ALLOWED:
                    raise ValueError('지원하지 않는 회의록·요약 첨부 형식입니다.')
                path = Path(folder) / (str(index) + ext)
                path.write_bytes(raw)
                extracted = extract(path)
                if extracted['truncated']:
                    raise ValueError('추출된 원문이 잘렸습니다. 파일을 나누어 보내 주세요.')
                parts.append(f'[파일: {name}]\n{extracted["text"]}')
            result = analyze(kind, '\n\n'.join(parts), provider)
            title = source_title(LABELS[kind], [name for name, _ in files])
            pdf = Path(folder) / 'result.pdf'
            create(result, pdf, title=title)
            return publish_report(kind, {title + '.pdf': pdf.read_bytes()}, credentials=credentials)
    else:
        raise ValueError('지원하지 않는 보고서 명령입니다.')

    title = finance_title(company, kind)
    with tempfile.TemporaryDirectory() as folder:
        pdf = Path(folder) / 'result.pdf'
        if builder:
            builder(prepared, pdf, title=title)
        else:
            tax_report(company, files, pdf, title)
        return publish_report('finance', {title + '.pdf': pdf.read_bytes()}, credentials=credentials)
