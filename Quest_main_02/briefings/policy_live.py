"""Collect all pages of the approved Bizinfo API and save three local reports."""
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from briefings.policy_api import request_page
from briefings.separate_reports import cell, valid_url
from briefings.windows_secret import load

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / 'data' / 'policy-live'
KST = timezone(timedelta(hours=9))
REGIONS = {'서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'}


def parse_page(payload):
    try:
        response = payload['response']
        if str(response['header']['resultCode']) not in ('00', '0'):
            raise ValueError('API가 정상 응답을 반환하지 않았습니다.')
        body = response['body']
        total = int(body['totalCount'])
        data = body.get('items') or {}
        rows = data.get('item', []) if isinstance(data, dict) else data
        if isinstance(rows, dict):
            rows = [rows]
        if not isinstance(rows, list) or any(not isinstance(x, dict) for x in rows):
            raise ValueError('공고 응답 형식이 올바르지 않습니다.')
        return total, rows
    except (KeyError, TypeError, AttributeError) as exc:
        raise ValueError('공고 응답 형식이 올바르지 않습니다.') from exc


def collect(key, get_page=request_page, size=100, max_pages=1000):
    """Do not publish partial data on page failure or changed totals."""
    rows, seen_pages = [], set()
    expected = None
    for page in range(1, max_pages + 1):
        total, items = parse_page(get_page(key, page=page, size=size))
        if expected is None:
            expected = total
        elif total != expected:
            raise ValueError('수집 중 전체 건수가 변경되어 재수집이 필요합니다.')
        if not items:
            if len(rows) < expected:
                raise ValueError('전체 공고를 받기 전에 빈 페이지가 반환되었습니다.')
            break
        signature = tuple(str(x.get('pblancId') or '') for x in items)
        if signature in seen_pages:
            raise ValueError('중복 페이지가 반환되어 수집을 중단했습니다.')
        seen_pages.add(signature)
        rows.extend(items)
        if len(rows) >= expected:
            break
    if expected is None or len(rows) != expected:
        raise ValueError('응답 건수와 전체 건수가 달라 수집을 중단했습니다.')
    unique, seen = [], set()
    for row in rows:
        item_id = str(row.get('pblancId') or '').strip()
        if item_id and item_id in seen:
            continue
        if item_id:
            seen.add(item_id)
        unique.append(row)
    return unique, {'received': len(rows), 'total': expected, 'duplicates': len(rows)-len(unique)}


def region_for(item):
    """Only assign a region from an explicit regional prefix or explicit nationwide tag."""
    supplied = str(item.get('_region') or '').strip()
    if supplied:
        aliases = {'서울특별시':'서울','경기도':'경기'}
        supplied = aliases.get(supplied,supplied)
        return supplied if supplied in REGIONS or supplied=='전국' else '지역 확인 필요'
    title = str(item.get('pblancNm') or '').strip()
    match = re.match(r'^\[([^\]]+)\]', title)
    if match:
        label = match.group(1).strip()
        if label == '전국' or label in REGIONS:
            return label
        return '지역 확인 필요'
    tags = {x.strip() for x in str(item.get('hashtags') or '').split(',')}
    if '전국' in tags:
        return '전국'
    return '지역 확인 필요'


def deadline_for(item):
    raw = str(item.get('reqstBeginEndDe') or '').strip()
    dates = re.findall(r'(?<!\d)(\d{4})[-./]?(\d{2})[-./]?(\d{2})(?!\d)', raw)
    if len(dates) < 2:
        return None
    try:
        return date(*map(int, dates[-1]))
    except ValueError:
        return None


def status_for(item, today):
    end = deadline_for(item)
    return '마감일 미확인' if end is None else ('기한 경과' if end < today else '마감일 남음')


def report(title, rows, stamp, today, overall_unknown, source_status=None):
    counts = Counter(region_for(x) for x in rows)
    lines = [f'# 기업마당 지원사업 — {title}', '',
        f'- 수집 시각: {stamp} (한국 시간) · 출처: 공공데이터포털',
        f'- 목록 {len(rows):,}건 · 마감 분류 기준: {today.isoformat()}',
        '- 제공된 지역 필드, 제목 앞 지역 표기 또는 명시적인 전국 태그로 분류했습니다. 불명확한 지역은 확인 필요로 두었습니다.',
        '- ‘마감일 남음’은 API의 날짜만 기준으로 분류한 결과이며 실제 접수 여부와 지원 대상은 원문 확인이 필요합니다.',
        '- 세 출처의 전체 공고를 보장하지 않습니다. 서로 다른 출처의 유사 공고는 별도로 표시될 수 있습니다.',
        '- 출처 수집: '+', '.join(f'{k} {v}' for k,v in (source_status or {'기업마당':'성공','K-Startup':'미연결','판판대로':'미연결'}).items()),
        f'- 전체 수집 중 지역 확인 필요: {overall_unknown:,}건. 서울·경기 목록에서는 해당 항목을 제외했으므로 전국 목록에서 확인하세요.', '']
    if title == '전국':
        categories = [('서울', lambda r:r=='서울'), ('경기', lambda r:r=='경기'),
                      ('전국 대상', lambda r:r=='전국'), ('그 밖의 지역', lambda r:r in REGIONS-{'서울','경기'}),
                      ('지역 확인 필요', lambda r:r=='지역 확인 필요')]
    else:
        local = '서울' if title.endswith('서울') else '경기'
        categories = [(local, lambda r:r==local), ('전국 대상', lambda r:r=='전국')]
    for heading, criterion in categories:
        group = [x for x in rows if criterion(region_for(x))]
        lines.extend([f'## {heading} · {len(group):,}건', ''])
        for status in ('마감일 남음', '마감일 미확인', '기한 경과'):
            subset = [x for x in group if status_for(x,today)==status]
            if not subset:
                continue
            subset.sort(key=lambda x: (deadline_for(x) or date.max, str(x.get('pblancNm') or '')))
            lines.extend([f'### {status} · {len(subset):,}건', '', '| 공고명 | 지역 | 분야 | 기관 | 신청기간 | 출처 | 원문 |', '| --- | --- | --- | --- | --- | --- | --- |'])
            for x in subset:
                link=valid_url(x.get('pblancUrl'))
                lines.append('| '+' | '.join((cell(x.get('pblancNm')),cell(region_for(x)),cell(x.get('pldirSportRealmLclasCodeNm')),cell(x.get('jrsdInsttNm')),cell(x.get('reqstBeginEndDe')),cell(x.get('_source') or '기업마당'),f'[원문 열기](<{link}>)' if link else '링크 없음'))+' |')
            lines.append('')
        if not group:
            lines.append('해당 항목이 없습니다.\n')
    return '\n'.join(lines)


def save_reports(items, stats, dest=DESTINATION, now=None, source_status=None):
    now = now or datetime.now(KST)
    today = now.date()
    stamp = now.strftime('%Y-%m-%d %H:%M:%S')
    groups = {'01_전국.md':('전국',items),
              '02_전국_서울.md':('전국+서울',[x for x in items if region_for(x) in ('전국','서울')]),
              '03_전국_경기.md':('전국+경기',[x for x in items if region_for(x) in ('전국','경기')])}
    counts = Counter(region_for(x) for x in items)
    dest.mkdir(parents=True, exist_ok=True)
    for filename,(title,selected) in groups.items():
        (dest/filename).write_text(report(title,selected,stamp,today,counts['지역 확인 필요'],source_status),encoding='utf-8')
    doc = {'source':'공공데이터포털', 'source_status':source_status or {'기업마당':'성공','K-Startup':'미연결','판판대로':'미연결'}, 'collected_at_kst':now.isoformat(), 'stats':stats, 'region_counts':dict(counts), 'items':items}
    (dest/'기업마당_수집원본.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'total':len(items), '서울':counts['서울'], '경기':counts['경기'], '전국':counts['전국'],
            '그 밖의 지역':sum(counts[r] for r in REGIONS-{'서울','경기'}), '지역 확인 필요':counts['지역 확인 필요'], **stats}


def main():
    try:
        items, stats = collect(load())
        print(json.dumps(save_reports(items,stats),ensure_ascii=False))
    except (OSError, ValueError) as exc:
        print(f'수집 중단: {exc}',file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
