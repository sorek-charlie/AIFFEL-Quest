"""PDF reports assembled from normalized financial data."""
from decimal import Decimal, ROUND_HALF_UP
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .finance_input import LABELS

CHECKS = {
    'balance': '자산 = 부채 + 자본',
    'gross': '매출액 − 매출원가 = 매출총이익',
    'operating': '매출총이익 − 판매관리비 = 영업이익',
}
REPORT_FILES = {'brief': 'brief.pdf', 'deep': 'deep.pdf', 'comprehensive': 'comprehensive.pdf'}


def money(value):
    if value is None:
        return '자료 없음'
    return f"{(Decimal(value) / 1_000_000).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):,.2f}"


def ratio(numerator, denominator, *, growth=False):
    if numerator is None or denominator is None or denominator <= 0:
        return '계산 불가'
    fraction = Decimal(numerator) / Decimal(denominator) - int(growth)
    return f"{(fraction * 100).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)}%"


def check_lines(row):
    statuses = {True: '일치', False: '불일치', None: '자료 부족'}
    return [f"{label}  ·  {statuses[row['checks'][key]]}" for key, label in CHECKS.items()]


class FinancialPDF:
    def __init__(self, data, title):
        for name, file in [('FinMalgun', 'malgun.ttf'), ('FinMalgunBold', 'malgunbd.ttf')]:
            if name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(name, f'C:/Windows/Fonts/{file}'))
        self.data = data
        self.title = title
        self.story = []
        self.years = [f"{row['year']}년" for row in data['rows']]
        self.styles = {
            'title': self.style('title', 28, 38, bold=True),
            'heading': self.style('heading', 18, 26, bold=True),
            'body': self.style('body', 11, 18),
            'source': self.style('source', 9, 14),
        }

    @staticmethod
    def style(name, size, leading, *, bold=False):
        return ParagraphStyle(name, fontName='FinMalgunBold' if bold else 'FinMalgun',
                              fontSize=size, leading=leading, spaceAfter=8, wordWrap='CJK',
                              textColor=colors.HexColor('#183350'), keepWithNext=name == 'heading')

    def line(self, text, style='body'):
        self.story.append(Paragraph(escape(str(text)).replace('\n', '<br/>'), self.styles[style]))

    def cover(self):
        self.story.append(Spacer(1, 90))
        self.line(self.title, 'title')
        self.line(self.data['company'], 'heading')
        self.line('대표자 · ' + (self.data.get('representative') or '자료 없음'))
        self.line('대상 기간 · ' + ', '.join(self.years))
        if self.data.get('report_basis'):
            self.line(self.data['report_basis'])

    def section(self, title, keys=(), notes=()):
        if not self.story and '_' in self.title:
            self.line(self.title, 'title')
        elif self.story:
            self.story.append(PageBreak())
        self.line(title, 'heading')
        if keys:
            self.table(keys)
        for note in notes:
            self.line(note)

    def table(self, keys, *, exact=False):
        def amount(value):
            if exact:
                return '자료 없음' if value is None else f'{value:,}'
            return money(value)

        self.line('금액 단위 · 원' if exact else '금액 단위 · 백만원 (소수 둘째 자리 반올림)', 'source')
        rows = self.data['rows']
        cells = [['항목', *self.years]]
        cells.extend([LABELS[key], *(amount(row.get(key)) for row in rows)] for key in keys)
        width = landscape(A4)[0] - 96
        table = Table(cells, colWidths=[width * .34, *([width * .66 / len(rows)] * len(rows))],
                      repeatRows=1, hAlign='LEFT')
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'FinMalgun'),
            ('FONTNAME', (0, 0), (-1, 0), 'FinMalgunBold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8f0f7')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7f9fc')]),
            ('GRID', (0, 0), (-1, -1), .35, colors.HexColor('#cfdae4')),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        self.story.extend([table, Spacer(1, 12)])

    def metrics(self, definitions):
        for row in self.data['rows']:
            values = [f'{label} {ratio(row.get(key), row.get(base))}' for label, key, base in definitions]
            self.line(f"{row['year']}년  ·  " + '  ·  '.join(values))

    def sources(self):
        self.line('공시 출처' if self.data.get('disclosure_url') else '첨부 자료', 'heading')
        for name in self.data.get('input_names', []):
            self.line(name, 'source')
        for warning in self.data.get('warnings', []):
            self.line('확인 필요 · ' + warning, 'source')

    def build(self, path):
        width, _ = landscape(A4)
        doc = SimpleDocTemplate(str(path), pagesize=landscape(A4), leftMargin=42, rightMargin=42,
                                topMargin=40, bottomMargin=38, title=self.title, author='업무 작업실')

        def footer(canvas, document):
            canvas.setFont('FinMalgun', 8)
            canvas.setFillColor(colors.HexColor('#526477'))
            canvas.drawString(48, 20, '업무 작업실  ·  ' + self.title)
            canvas.drawRightString(width - 48, 20, str(document.page))

        doc.build(self.story, onFirstPage=footer, onLaterPages=footer)


SUMMARY = ('assets', 'liabilities', 'equity', 'sales', 'operating_profit', 'net_profit')
INCOME = ('sales', 'cost_of_sales', 'gross_profit', 'selling_admin', 'operating_profit',
          'pretax', 'income_tax', 'net_profit')
BALANCE = ('assets', 'current_assets', 'noncurrent_assets', 'liabilities', 'current_liabilities', 'equity', 'capital')
METRICS = (
    ('영업이익률', 'operating_profit', 'sales'),
    ('유동비율', 'current_assets', 'current_liabilities'),
    ('부채비율', 'liabilities', 'equity'),
)
AI_NOTE = 'AI 검토 · 원자료와 대조해 확인하세요. '


def make_brief(data, path, *, title=None):
    report = FinancialPDF(data, title or '간략보고서')
    report.cover()
    basis = data.get('report_basis')
    note = basis or AI_NOTE + (data.get('llm_commentary') or '검토 의견 없음')
    report.section('기업 현황과 연도별 재무 요약', SUMMARY, (note,))
    report.section('제조원가와 매출총이익', ('sales', 'cost_of_sales', 'gross_profit'),
                   ('원재료비·노무비·제조경비는 상세 자료가 있을 때 확인할 수 있습니다.',))
    report.section('손익 및 판매관리비', INCOME)
    report.metrics(METRICS[:1])
    report.section('재무상태와 안정성', BALANCE)
    report.metrics(METRICS[2:])
    report.section('신용공여 및 추가 확인', ('short_debt', 'payables', 'receivables', 'inventory'),
                   ('기관·만기별 여신 및 주주 현황은 별도 자료를 확인하세요.',))
    if basis:
        report.section('출처')
    else:
        report.section('출처와 검산', notes=('상세 계정별 출처와 검산 내역은 원자료 대조 및 검산 PDF에 있습니다.',))
        for row in data['rows']:
            report.line(f"{row['year']}년  ·  " + '  /  '.join(check_lines(row)), 'source')
    report.sources()
    report.build(path)


def make_deep(data, path, *, title=None):
    report = FinancialPDF(data, title or '심층보고서')
    report.cover()
    report.section('업체 현황과 재무 요약', SUMMARY,
                   ('사업 분야 · ' + (data.get('business') or '자료 없음'),))
    report.section('경영실적 분석', ('sales', 'gross_profit', 'selling_admin', 'operating_profit'),
                   (AI_NOTE + (data.get('llm_commentary') or '검토 의견 없음'),))
    report.section('손익계산서', INCOME)
    report.section('제조원가와 손익 영향', ('sales', 'cost_of_sales', 'gross_profit'),
                   ('원재료비·노무비·제조경비 상세 및 원가 분해는 원가명세서에서 확인하세요.',))
    report.section('재무상태표', BALANCE + ('receivables', 'inventory'))
    report.section('재무지표', notes=('각 비율은 해당 연도 자료로 계산합니다. 분모가 없거나 0 이하이면 계산 불가로 표시합니다.',))
    report.metrics(METRICS)
    report.section('신용공여와 검산', ('short_debt', 'payables', 'interest'),
                   ('기관·과목·만기별 여신 내역은 별도 자료를 확인하세요.',))
    for row in data['rows']:
        report.line(f"{row['year']}년  ·  " + '  /  '.join(check_lines(row)), 'source')
    report.build(path)


class ComprehensivePDF(FinancialPDF):
    """Landscape company-introduction layout used by the comprehensive reference."""

    width = landscape(A4)[0] - 96
    ink = colors.HexColor('#18232e')
    border = colors.HexColor('#d7dee5')
    blue = colors.HexColor('#245a9a')
    pale = colors.HexColor('#f2f5f8')

    def section(self, title, keys=(), notes=()):
        super().section(title)
        self.story.append(HRFlowable(width='100%', thickness=2, color=self.ink, spaceAfter=13))
        if keys:
            self.table(keys)
        for note in notes:
            self.line(note)

    def cards(self, entries, *, blue_top=False):
        entries = tuple(entries)
        cells = [[
            Paragraph(escape(label), self.styles['heading']),
            Paragraph(escape(str(value)).replace('\n', '<br/>'), self.styles['body']),
        ] for label, value in entries]
        table = Table([[cell for cell in cells]], colWidths=[self.width / len(cells)] * len(cells))
        outline = ('LINEABOVE', (0, 0), (-1, 0), 3, self.blue) if blue_top else (
            'GRID', (0, 0), (-1, 0), 0.6, self.border,
        )
        table.setStyle(TableStyle([outline, ('BACKGROUND', (0, 0), (-1, 0), self.pale),
                                   ('VALIGN', (0, 0), (-1, 0), 'TOP'),
                                   ('LEFTPADDING', (0, 0), (-1, 0), 12),
                                   ('RIGHTPADDING', (0, 0), (-1, 0), 12),
                                   ('TOPPADDING', (0, 0), (-1, 0), 12)]))
        self.story.extend([table, Spacer(1, 14)])

    def cover(self):
        centered_title = self.styles['title'].clone('cover-title', alignment=1)
        centered_body = self.styles['body'].clone('cover-body', alignment=1)
        company = self.data['company']
        contents = [
            Paragraph(escape(self.title if self.title != '종합보고서' else company + ' 회사소개서'), centered_title),
        ]
        width = self.width * .73
        inset = Table([[contents]], colWidths=[width - 10])
        inset.setStyle(TableStyle([('BOX', (0, 0), (0, 0), .55, self.ink),
                                   ('TOPPADDING', (0, 0), (0, 0), 22),
                                   ('BOTTOMPADDING', (0, 0), (0, 0), 18)]))
        box = Table([[inset]], colWidths=[width], hAlign='CENTER')
        box.setStyle(TableStyle([('BOX', (0, 0), (0, 0), 1.1, self.ink),
                                 ('LEFTPADDING', (0, 0), (0, 0), 5),
                                 ('RIGHTPADDING', (0, 0), (0, 0), 5)]))
        self.story.extend([Spacer(1, 90), box, Spacer(1, 48)])
        self.story.append(Paragraph(escape('재무 실적 기준 · ' + ' / '.join(self.years)), centered_body))
        self.story.append(Paragraph(escape('대표자 · ' + (self.data.get('representative') or '자료 없음')),
                                    centered_body))

    def annual_sales_chart(self, sales):
        actuals = [(row['year'], row['amount']) for row in sales]
        if not actuals or any(amount < 0 for _, amount in actuals):
            return
        maximum = max(amount for _, amount in actuals)
        if maximum == 0:
            return
        height = len(actuals) * 24
        chart = Drawing(self.width, height)
        for index, (year, amount) in enumerate(actuals):
            y = height - (index + 1) * 24
            chart.add(String(0, y + 9, f'{year}년', fontName='FinMalgun', fontSize=10, fillColor=self.ink))
            chart.add(Rect(76, y + 4, float(Decimal(amount) / maximum) * (self.width - 174), 16,
                           fillColor=self.blue, strokeColor=None))
            chart.add(String(self.width - 6, y + 9, money(amount), fontName='FinMalgun',
                             fontSize=10, fillColor=self.ink, textAnchor='end'))
        self.story.extend([chart, Spacer(1, 12)])

    def evidence(self, title, fields, context):
        entries = [(label, context[key]) for label, key in fields if key in context]
        if not entries:
            self.unavailable(title, '이 항목을 확인할 수 있는 원자료가 필요합니다.')
            return
        self.section(title)
        self.cards((label, record['value']) for label, record in entries)
        for label, record in entries:
            self.line(f"{label} 출처 · {record['source']}", 'source')

    def unavailable(self, title, needed):
        self.section(title)
        self.cards((('자료 없음', needed),))


def make_comprehensive(data, path, *, title=None):
    report = ComprehensivePDF(data, title or '종합보고서')
    rows = data['rows']
    latest = rows[-1]
    actual = f"{latest['year']}년"
    plan = data.get('plan_note')
    funding = data.get('funding_note')
    company = data['company']
    report.cover()

    report.section('CONTENTS · 회사소개서 목차')
    report.cards((
        ('Ⅰ 회사 개요', 'Summary · 기업 개요 · 회사 이력 · 수상·인증 · 영업 네트워크 · 조직·매장 현황'),
        ('Ⅱ 성장 실적', '연간 매출 성장 · 상반기 실적 · 매출과 수익 흐름'),
        ('Ⅲ 성장 계획', '전망 · 시나리오 · 사업 방향 · 실행 로드맵 · 온라인 매출 · 인원 계획'),
        ('Ⅳ 자금 활용', '자금 배분 · 상환 부담 · 부채 구성 · 채무 이슈 · 여신 개선'),
    ), blue_top=True)

    report.section('Ⅰ Summary')
    report.line(actual + ' 실적 · 금액 단위 백만원', 'source')
    report.cards(
        [(LABELS[key], money(latest.get(key))) for key in ('sales', 'operating_profit', 'net_profit')]
        + [('부채비율', ratio(latest.get('liabilities'), latest.get('equity')))]
    )
    report.table(SUMMARY)
    report.line(AI_NOTE + (data.get('llm_commentary') or '검토 의견 없음'))

    context = data.get('context', {})
    profile = context.get('company_profile', {})
    report.section('Ⅰ 기업 개요')
    industry = profile.get('industry', {})
    report.cards((('기업명', company), ('기업 규모', profile.get('size', {}).get('value', '자료 없음')),
                  ('사업 분야', data.get('business') or industry.get('value') or '자료 없음')))
    report.table(('assets', 'liabilities', 'equity', 'capital'))
    if industry:
        report.line('산업분류 출처 · ' + industry['source'], 'source')
    report.evidence('Ⅰ 회사 이력', [('설립일', 'founded')], profile)
    report.evidence('Ⅰ 수상·인증', [('확인된 기업 인증', 'certifications')], profile)
    report.evidence('Ⅰ 영업 네트워크', [('매출 구성', 'sales_channel'), ('주요 제품', 'products')], profile)
    report.evidence('Ⅰ 조직·매장 현황', [('종업원 수', 'employees'), ('사업장', 'office')], profile)

    report.section('Ⅱ 연간 매출 성장')
    sales = context.get('sales_history') or [
        {'year': row['year'], 'amount': row['sales']} for row in rows if row.get('sales') is not None
    ]
    report.line('결산 매출액 · 백만원', 'source')
    report.annual_sales_chart(sales)
    for previous, current in zip(sales, sales[1:]):
        if current['year'] == previous['year'] + 1:
            change = ratio(current['amount'], previous['amount'], growth=True)
            report.line(f"{current['year']}년 전기 대비 매출 증가율 · {change}", 'source')
    for item in sales:
        if item.get('source'):
            report.line(f"{item['year']}년 매출 출처 · {item['source']}", 'source')
    vat_periods = context.get('vat_periods', [])
    if vat_periods:
        report.section('Ⅱ 상반기 실적 및 후속 기간')
        report.line('부가가치세 신고 과세표준입니다. 회계상 결산 매출액과 집계 기준이 다릅니다.')
        for item in vat_periods:
            report.line(f"{item['start']} ~ {item['end']} · 과세표준 {item['total']:,}원 · 납부할 세액 {item['tax']:,}원")
            report.line('출처 · ' + item['source'], 'source')
    else:
        report.unavailable('Ⅱ 상반기 실적', '동일 기간끼리 비교할 반기 실적이 필요합니다.')
    report.section('Ⅱ 매출과 수익 흐름', INCOME)
    report.metrics(METRICS[:1] + (('매출총이익률', 'gross_profit', 'sales'),))
    indicators = context.get('growth_indicators', [])
    for label in ('매출액증가율', '영업이익증가율', '순이익증가율'):
        series = [item for item in indicators if item['label'] == label]
        if series:
            reported = ' · '.join(f"{item['year']}년 {item['value']}" for item in series)
            report.line(f"자료 기재 {label} · {reported}", 'source')
            report.line('출처 · ' + ' / '.join(item['source'] for item in series), 'source')

    report.unavailable('Ⅲ 기준 전망', '목표 기간과 매출·비용 가정을 확인할 자료가 필요합니다.')
    report.unavailable('Ⅲ 성장 시나리오', '시나리오별 실적 가정과 근거 자료가 필요합니다.')
    if plan:
        report.section('Ⅲ 사업 방향')
        report.cards((('사용자 입력 계획', plan),))
    else:
        report.unavailable('Ⅲ 사업 방향', '확인된 사업 방향과 성장계획이 필요합니다.')
    report.unavailable('Ⅲ 실행 로드맵', '추진 과제별 담당자와 일정이 필요합니다.')
    report.unavailable('Ⅲ 온라인 매출 성장', '온라인 매출 실적과 채널별 목표가 필요합니다.')
    report.unavailable('Ⅲ 인원 성장 계획', '기준 인원과 직무별 충원 계획이 필요합니다.')

    if funding:
        report.section('Ⅳ 자금 활용안 · 배분')
        report.cards((('사용자 입력 자금 활용', funding),))
    else:
        report.unavailable('Ⅳ 자금 활용안 · 배분', '예정 조달 규모와 용도별 배분 계획이 필요합니다.')
    report.unavailable('Ⅳ 자금 소요 근거', '항목별 산출 근거와 집행 일정이 필요합니다.')
    report.section('Ⅳ 상환 및 이자 부담', ('short_debt', 'long_debt', 'interest', 'operating_profit'))
    report.line('신규 차입의 금리·만기·상환 방식은 약정 자료에서 확인해야 합니다.')
    report.section('Ⅳ 부채 구성', ('liabilities', 'current_liabilities', 'short_debt', 'long_debt', 'payables', 'equity'))
    report.metrics(METRICS[1:])
    if any(row.get('long_debt') is not None for row in rows):
        report.section('Ⅳ 사업자채무', ('long_debt', 'related_long_debt', 'other_long_debt'))
        report.line('재무상태표에 기재된 범위입니다. 개별 채권자와 금리 조건은 약정 자료에서 확인해야 합니다.')
        for year, sources in data.get('sources', {}).items():
            if 'long_debt' in sources:
                report.line(f"{year}년 장기차입금 출처 · {sources['long_debt']}", 'source')
    else:
        report.unavailable('Ⅳ 사업자채무', '채권자·만기·이자 조건을 확인할 계약과 채무명세가 필요합니다.')
    report.unavailable('Ⅳ 가수금 출자전환', '대상 가수금과 출자전환 조건을 확인할 자료가 필요합니다.')
    report.unavailable('Ⅳ 매출채권처분손실', '채권처분 내역과 손실 계정을 확인할 근거가 필요합니다.')
    report.section('Ⅳ 손실과 부채비율의 관계', ('operating_profit', 'net_profit', 'equity', 'liabilities'))
    report.metrics(METRICS[2:])
    report.line('기간별 자본과 부채의 변화를 함께 확인합니다. 손익 외 자본변동의 상세 원인은 별도 근거가 필요합니다.')
    report.section('Ⅳ 여신 및 재무 개선', ('cash', 'receivables', 'inventory', 'short_debt'))
    facilities = context.get('credit_facilities', [])
    for item in facilities:
        detail = ' · '.join(f"{value['term']} {value['amount']:,}원" for value in item['maturity'])
        report.line(f"{item['institution']} · {item['product']} · 잔액 {item['amount']:,}원"
                    + (f" · 만기 구간 {detail}" if detail else ''))
        report.line('출처 · ' + item['source'], 'source')
    report.line('계정별 출처와 검산 결과는 원자료 대조 및 검산 PDF에서 확인할 수 있습니다.')
    for row in rows:
        report.line(f"{row['year']}년  ·  " + '  /  '.join(check_lines(row)), 'source')
    report.build(path)


def make_input(data, path, *, title=None):
    report = FinancialPDF(data, title or '분석 입력')
    report.section('정규화한 재무 계정')
    report.line(data['company'])
    report.table(LABELS, exact=True)
    report.section('기업 정보와 요청사항')
    for key, label in [('representative', '대표자'), ('business', '사업 분야'), ('plan_note', '성장계획'),
                       ('funding_note', '자금 활용'), ('request_note', '요청사항')]:
        report.line(f"{label} · {data.get(key) or '자료 없음'}")
    report.sources()
    report.build(path)


def make_audit(data, path, *, title=None):
    report = FinancialPDF(data, title or '원자료 대조 및 검산')
    for row in data['rows']:
        year = str(row['year'])
        report.section(year + '년 검산')
        report.line(data['company'] + '  ·  금액 단위 원')
        for line in check_lines(row):
            report.line(line)
        report.line('계정별 출처', 'heading')
        for key, label in LABELS.items():
            value = row.get(key)
            amount = '자료 없음' if value is None else f'{value:,}원'
            origin = data.get('sources', {}).get(year, {}).get(key, '출처 없음')
            report.line(f'{label}  ·  {amount}  ·  {origin}', 'source')
    report.sources()
    report.build(path)
