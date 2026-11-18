"""Read annual financial statements from the public DART viewer."""
import re
from datetime import datetime
from urllib.parse import urlencode
from urllib.request import Request, build_opener

from bs4 import BeautifulSoup

from briefings.policy_api import NoRedirect
from .finance_input import ALIASES, UNITS, normalize_label, number
from .report_names import KST

BASE = 'https://dart.fss.or.kr'
MAX_PAGE = 5_000_000
RECEIPT = re.compile(r'/dsaf001/main\.do\?rcpNo=(\d{14})(?:&|$)')
ALIASES_BY_NAME = {normalize_label(label): key for key, labels in ALIASES.items() for label in labels}
ALIASES_BY_NAME['법인세비용수익'] = 'income_tax'
CHECKS = {
    'balance': ('assets', 'liabilities', 'equity'),
    'gross': ('sales', 'cost_of_sales', 'gross_profit'),
    'operating': ('gross_profit', 'selling_admin', 'operating_profit'),
}


def request(path, fields=None):
    headers = {'User-Agent': 'Mozilla/5.0', 'Referer': BASE + '/dsab001/main.do'}
    if fields is not None:
        headers['X-Requested-With'] = 'XMLHttpRequest'
    body = urlencode(fields).encode('ascii') if fields is not None else None
    try:
        with build_opener(NoRedirect()).open(Request(BASE + path, body, headers), timeout=20) as response:
            content = response.read(MAX_PAGE + 1)
    except OSError:
        raise ValueError('전자공시 DART에 연결하지 못했습니다.') from None
    if len(content) > MAX_PAGE:
        raise ValueError('DART 공시가 처리 범위를 초과했습니다.')
    return content.decode('utf-8', errors='replace')


def company_key(name):
    name = re.sub(r'^\s*(?:㈜|\(주\)|주식회사)\s*|\s*(?:㈜|\(주\)|주식회사)\s*$', '', name.strip())
    return ''.join(name.split()).casefold()


def annual_filing(company, *, now=None, fetch=request):
    now = now or datetime.now(KST)
    name = company_key(company)
    if not name or len(name) > 60:
        raise ValueError('DART에서 조회할 정확한 회사명을 입력해 주세요.')
    result = fetch('/dsab001/search.ax', {
        'textCrpNm': name,
        'startDate': f'{now.year-2}.01.01',
        'endDate': now.strftime('%Y.%m.%d'),
        'currentPage': '1', 'maxResults': '50', 'sort': 'date', 'series': 'desc',
        'publicType': 'A001', 'finalReport': 'recent',
    })
    matches = {}
    for row in BeautifulSoup(result, 'html.parser').find_all('tr'):
        corp = row.select_one('a[onclick*="openCorpInfoNew"]')
        if corp is None or company_key(corp.get_text(strip=True)) != name:
            continue
        code = re.search(r"openCorpInfoNew\('(\d{8})'", corp.get('onclick', ''))
        for anchor in row.select('a[href*="rcpNo="]'):
            receipt = RECEIPT.search(anchor['href'])
            label = ' '.join(anchor.stripped_strings)
            period = re.search(r'사업보고서\s*\(\s*(\d{4})\.\d{2}\s*\)', label)
            if code and receipt and period and receipt[1][:8] <= now.strftime('%Y%m%d'):
                matches.setdefault(code[1], []).append((int(period[1]), receipt[1], corp.get_text(strip=True)))
    if len(matches) > 1:
        raise ValueError('동일한 이름의 DART 공시 법인이 여러 곳입니다. 회사명을 확인해 주세요.')
    if not matches:
        if not BeautifulSoup(result, 'html.parser').find('table'):
            raise ValueError('DART에서 공시 검색 결과를 확인하지 못했습니다.')
        return None
    return max(next(iter(matches.values())))


def viewer_path(document, receipt):
    items = re.split(r"\bvar node\d+\s*=\s*\{\};", document)
    for basis, title in [('연결', '연결재무제표'), ('별도', '재무제표')]:
        for item in items:
            fields = dict(re.findall(r"node\d+\['(\w+)'\]\s*=\s*\"([^\"]+)\"", item))
            text = re.sub(r'^\d+\.\s*|\s+', '', fields.get('text', ''))
            if text != title or fields.get('rcpNo') != receipt:
                continue
            keys = ('rcpNo', 'dcmNo', 'eleId', 'offset', 'length')
            if all(fields.get(key, '').isdigit() for key in keys) and re.fullmatch(r'dart\w*\.xsd', fields.get('dtd', '')):
                return basis, '/report/viewer.do?' + urlencode({k: fields[k] for k in (*keys, 'dtd')})
    raise ValueError('DART 공시에 읽을 수 있는 재무제표 목차가 없습니다.')


def statement_rows(html, year):
    result = {}
    found = set()
    for table in BeautifulSoup(html, 'html.parser').find_all('table'):
        rows = []
        for tr in table.find_all('tr'):
            cells = [cell.get_text(' ', strip=True) for cell in tr.find_all(['th', 'td'], recursive=False)]
            if len(cells) == 4:
                label = re.sub(r'\s*\(주[^)]*\)\s*$', '', cells[0])
                key = ALIASES_BY_NAME.get(normalize_label(label))
                if any(cells[1:]):
                    rows.append((key, cells[1:]))
        keys = {key for key, _ in rows}
        kind = 'balance' if {'assets', 'liabilities', 'equity'} <= keys else 'income' if {'sales', 'operating_profit', 'net_profit'} <= keys else None
        if kind is None or kind in found:
            continue
        header = table.find_previous_sibling('table')
        header_text = header.get_text(' ', strip=True) if header else ''
        unit = re.search(r'단위\s*[:：]\s*(백만원|천원|억원|원)', header_text)
        years = list(dict.fromkeys(map(int, re.findall(r'(20\d{2})[.\-/년]', header_text))))
        if not unit or years != [year, year-1, year-2]:
            raise ValueError('DART 재무표의 비교 기간 또는 금액 단위를 확인할 수 없습니다.')
        found.add(kind)
        for key, values in rows:
            if not key:
                continue
            parsed = [number(value, UNITS[unit[1]]) if value.strip() not in ('', '-', '–', '—') else None for value in values]
            if key in result and result[key] != parsed:
                raise ValueError('DART 재무표에 같은 이름의 계정이 중복되어 확인이 필요합니다.')
            result[key] = parsed
    if found != {'balance', 'income'}:
        raise ValueError('DART에서 재무상태표와 손익계산서를 모두 확인하지 못했습니다.')
    rows = []
    for index in (2, 1, 0):
        row = {key: values[index] for key, values in result.items()}
        row['year'] = year-index
        checks = {}
        for key, columns in CHECKS.items():
            a, b, c = (row.get(column) for column in columns)
            checks[key] = None if None in (a, b, c) else (a == b + c if key == 'balance' else a - b == c)
        row['checks'] = checks
        rows.append(row)
    if any(False in row['checks'].values() for row in rows):
        raise ValueError('DART 재무표 합계가 일치하지 않아 자동 보고서를 보류했습니다.')
    return rows


def prepare(company, *, filing=None, now=None, fetch=request):
    filing = filing or annual_filing(company, now=now, fetch=fetch)
    if not filing:
        raise ValueError('회사명과 일치하는 최근 DART 사업보고서를 찾지 못했습니다.')
    year, receipt, display_name = filing
    main = '/dsaf001/main.do?rcpNo=' + receipt
    basis, viewer = viewer_path(fetch(main), receipt)
    return {
        'company': display_name, 'rows': statement_rows(fetch(viewer), year),
        'report_basis': basis + ' 재무제표 · 사업보고서 연간 비교', 'disclosure_url': BASE + main,
        'input_names': [f'DART 사업보고서 · {year}년 결산 · 접수번호 {receipt}', BASE + main],
        'warnings': ['사업보고서의 연간 비교표 기준입니다. 분기 실적과 기관·만기별 신용공여는 별도 확인이 필요합니다.'],
    }
