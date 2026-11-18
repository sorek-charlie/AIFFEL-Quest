"""Create a local-only anonymized financial input from the supplied credit-report ZIP."""
import json
import re
import sys
import zipfile
from decimal import Decimal
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web' / 'private-demo'

def values(page, label):
    lines = [x.strip() for x in page.get_text().splitlines() if x.strip()]
    try:
        i = lines.index(label)
    except ValueError as exc:
        raise ValueError(f'원자료에 필요한 계정이 없습니다: {label}') from exc
    numbers = lines[i+1:i+4]
    if len(numbers) != 3 or any(x != '-' and not re.fullmatch(r'-?[\d,]+', x) for x in numbers):
        raise ValueError(f'3개 연도 값을 확인할 수 없습니다: {label}')
    return [None if x == '-' else int(x.replace(',', '')) for x in numbers]

def main(archive, intro=None, out_dir=OUT):
    with zipfile.ZipFile(archive) as z:
        names = [n for n in z.namelist() if n.endswith('크레탑.pdf')]
        if len(names) != 1:
            raise ValueError('재무 원본 PDF를 하나로 특정할 수 없습니다.')
        if z.getinfo(names[0]).file_size > 25_000_000:
            raise ValueError('재무 원본 PDF는 25MB 이하여야 합니다.')
        doc = pymupdf.open(stream=z.read(names[0]), filetype='pdf')
    with doc:
        years_asset = re.findall(r'\b(20\d{2})-12-31\b', doc[12].get_text())[:3]
        years_income = re.findall(r'\b(20\d{2})-12-31\b', doc[15].get_text())[:3]
        if years_asset != ['2023','2024','2025'] or years_income != years_asset:
            raise ValueError('이 버전은 2023~2025년 크레탑 원자료 양식만 지원합니다. 회계연도와 양식을 확인하세요.')
        assets = {'assets':values(doc[12], '자산(*)'), 'current_assets':values(doc[12], '유동자산(*)'),
                  'cash':values(doc[12], '현금및현금성자산(*)'), 'receivables':values(doc[12], '매출채권(*)'),
                  'inventory':values(doc[12], '재고자산(*)'), 'noncurrent_assets':values(doc[12], '비유동자산(*)'),
                  'liabilities':values(doc[13], '부채(*)'), 'current_liabilities':values(doc[13], '유동부채(*)'),
                  'short_debt':values(doc[13], '단기차입금(*)'), 'payables':values(doc[13], '매입채무(*)'),
                  'equity':values(doc[13], '자본(*)'), 'capital':values(doc[13], '자본금(*)')}
        income = {'sales':values(doc[15], '매출액(*)'), 'cost_of_sales':values(doc[15], '매출원가(*)'),
                  'gross_profit':values(doc[15], '매출총이익(손실)'), 'selling_admin':values(doc[15], '판매비와관리비(*)'),
                  'operating_profit':values(doc[16], '영업이익(손실)'), 'interest':values(doc[16], '이자비용'),
                  'pretax':values(doc[16], '법인세비용차감전순손익'), 'income_tax':values(doc[16], '법인세비용'),
                  'net_profit':values(doc[17], '당기순이익(순손실)')}
        # A dash is missing, not zero, so income tax 2023 is intentionally not used in arithmetic.
    rows = []
    for i, year in enumerate((2023, 2024, 2025)):
        row = {'year':year, **{k:v[i] for k,v in {**assets,**income}.items()}}
        checks = {'balance':row['assets'] == row['liabilities'] + row['equity'],
                  'gross':row['sales'] - row['cost_of_sales'] == row['gross_profit'],
                  'operating':row['gross_profit'] - row['selling_admin'] == row['operating_profit']}
        if not all(checks.values()):
            raise ValueError(f'{year}년 재무 항목 검산 실패: {checks}')
        checks['net_difference_thousand_krw'] = None if row['income_tax'] is None else row['net_profit'] - (row['pretax'] - row['income_tax'])
        row['checks'] = checks
        rows.append(row)
    plan = {'2026_sales_100m_krw':None, '2027_sales_100m_krw':None, 'funding_100m_krw':None,
            'status':'회사소개서의 계획 값이 없으면 자료 부족으로 표기'}
    business = None
    if intro:
        with pymupdf.open(intro) as reference:
            if len(reference) < 18:
                raise ValueError('회사소개서에 계획 확인 페이지가 없습니다.')
            checks = [(11,'2026_sales_100m_krw',r'2026\s*년\s*기준\s*전망',r'연간\s*([\d,]+)\s*억원'),
                      (13,'2027_sales_100m_krw',r'2027\s*년\s*사업\s*방향',r'매출\s*목표\s*([\d,]+)\s*억원'),
                      (17,'funding_100m_krw',r'자금\s*활용안',r'총\s*조달\s*희망액\s*([\d,]+)\s*억원')]
            for page_no,key,heading,pattern in checks:
                text = ' '.join(reference[page_no].get_text().split())
                if re.search(heading,text):
                    match = re.search(pattern,text)
                    if match: plan[key] = int(match.group(1).replace(',',''))
            company_page = ' '.join(reference[3].get_text().split())
            if re.search(r'주요\s*사업\s*휴대폰\s*및\s*통신기기\s*도소매업', company_page):
                business = '통신기기 도소매업'
    data = {'company':'(주)대한민국', 'representative':'홍길동', 'business':business, 'unit':'천원',
            'data_note':'실제 원자료 수치를 사용한 비식별 로컬 데모. 2026년 2분기 미검증.',
            'source':'제공받은 기업 재무 원자료, 재무상태표 13~14쪽·손익계산서 16~18쪽',
            'rows':rows,
            'plan':plan,
            'privacy':'실제 재무수치가 포함된 비식별 자료이므로 외부 공유 전 검토 필요.'}
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / 'anonymized-input.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), 'utf-8')
    lines = ['# 재무 원자료 대조 결과', '', '대상: (주)대한민국 · 단위: 천 원',
             '2026년 2분기 수치는 대조하지 않았습니다.', '',
             '| 연도 | 자산=부채+자본 | 매출−원가=총이익 | 총이익−판관비=영업이익 | 세전−법인세 대비 순이익 차이 |',
             '|---|---|---|---|---|']
    for row in rows:
        c=row['checks']; diff=c['net_difference_thousand_krw']; mark=lambda value:'일치' if value else '불일치'
        delta='법인세 원자료 미표시' if diff is None else ('일치' if diff == 0 else f'{diff:+,}천 원 · 원문 확인 필요')
        lines.append(f"| {row['year']} | {mark(c['balance'])} | {mark(c['gross'])} | {mark(c['operating'])} | {delta} |")
    lines += ['', '차이의 원인은 확정하지 않았으며 원본 계정 및 반올림 여부 확인이 필요합니다.',
              '비식별 수치도 외부 공유 시 기업이 추정될 수 있으므로 공유 전 확인하세요.']
    (out_dir / 'reconciliation.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')
    print('비식별 입력 생성: 3개 연도, 연도별 재무상태·매출총이익·영업이익 검산 통과')

if __name__ == '__main__':
    if len(sys.argv) not in (2,3):
        raise SystemExit('사용법: python scripts/prepare_finance_demo.py <원자료 ZIP> [회사소개서 PDF]')
    main(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv)==3 else None)
