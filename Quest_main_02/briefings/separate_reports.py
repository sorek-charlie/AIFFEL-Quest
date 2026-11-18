"""Create separate Markdown inventories from saved policy HTML files.

This reads embedded JSON only; it does not execute HTML or access the network.
"""
import argparse
import json
import re
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

from briefings.html_snapshot import EmbeddedData


def text(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def cell(value):
    return text(value).replace('\\', '\\\\').replace('|', '\\|').replace('[', '\\[').replace(']', '\\]') or '확인 필요'


def valid_url(value):
    url = text(value)
    parsed = urlparse(url)
    return url if parsed.scheme in ('http', 'https') and parsed.hostname and not re.search(r'[\s<>]', url) else ''


def read_source(path):
    raw = path.read_bytes()
    if len(raw) > 15_000_000:
        raise ValueError('HTML 파일은 15MB 이하여야 합니다.')
    parser = EmbeddedData()
    parser.feed(raw.decode('utf-8-sig'))
    if not parser.parts:
        raise ValueError('briefing-data가 없습니다.')
    result = json.loads(''.join(parser.parts))
    for key in ('new', 'all'):
        if not isinstance(result.get(key, {}).get('items'), list):
            raise ValueError(f'{key} 목록이 없습니다.')
    return result


def identity(item):
    """Exact title and region plus URL: retain ambiguous same-URL records."""
    return (text(item.get('title')).casefold(), text(item.get('regionMajor') or item.get('region')).casefold(), valid_url(item.get('detailUrl')))


def make_report(path, title, as_of):
    source = read_source(path)
    items = source['all']['items']
    new_keys = {identity(x) for x in source['new']['items'] if isinstance(x, dict)}
    unique, seen = [], set()
    for item in items:
        if not isinstance(item, dict):
            continue
        key = identity(item)
        # Do not conflate independent incomplete entries lacking a usable title or URL.
        if key[0] and key[2] and key in seen:
            continue
        if key[0] and key[2]:
            seen.add(key)
        unique.append(item)

    groups = {'진행 가능성 확인': [], '마감일 미확인': [], '기한 경과': []}
    for item in unique:
        deadline = text(item.get('applyEnd'))
        try:
            parsed = date.fromisoformat(deadline)
        except ValueError:
            groups['마감일 미확인'].append(item)
        else:
            groups['기한 경과' if parsed < as_of else '진행 가능성 확인'].append(item)
    for group in groups.values():
        group.sort(key=lambda x: (text(x.get('applyEnd')) or '9999', text(x.get('title'))))

    lines = [f'# {title} 지원사업 간단 목록', '',
        f'- 자료: {path.name} (사용자 제공 저장본)',
        f'- 분류 기준일: {as_of.isoformat()} · 원본 전체 목록 {len(items)}건 → 중복 제거 후 {len(unique)}건 (중복 {len(items)-len(unique)}건)',
        f"- 마감일이 남은 항목 {len(groups['진행 가능성 확인'])}건 · 마감일 미확인 {len(groups['마감일 미확인'])}건 · 기한 경과 {len(groups['기한 경과'])}건",
        '- 각 파일을 독립 처리했습니다. 주간은 원본의 주간 목록에도 들어 있는 항목입니다.',
        '- 정적 저장본이므로 실시간 정보가 아닙니다. 접수 여부·자격·지원 내용은 반드시 원문에서 확인하세요.',
        '- 중복은 같은 제목·지역·유효한 원문 URL이 모두 같은 경우에만 제거했습니다. 링크 없는 항목과 같은 링크를 쓰는 다른 제목은 보존했습니다.', '']
    for group_name, group in groups.items():
        lines.extend([f'## {group_name} · {len(group)}건', '',
            '| 구분 | 공고명 | 지역 | 분야 | 기관 | 마감일 | 원문 |',
            '| --- | --- | --- | --- | --- | --- | --- |'])
        for x in group:
            url = valid_url(x.get('detailUrl'))
            # Markdown destination is enclosed in angle brackets to support parentheses.
            link = f'[원문 열기](<{url}>)' if url else '링크 없음'
            lines.append('| ' + ' | '.join(('주간' if identity(x) in new_keys else '전체', cell(x.get('title')), cell(x.get('regionMajor') or x.get('region')), cell(x.get('bizType')), cell(x.get('organization')), cell(x.get('applyEnd')), link)) + ' |')
        if not group:
            lines.append('| — | 항목 없음 | — | — | — | — | — |')
        lines.append('')
    return '\n'.join(lines), {'input':len(items), 'unique':len(unique), 'duplicates':len(items)-len(unique), **{k:len(v) for k,v in groups.items()}, 'regions':dict(Counter(text(x.get('regionMajor') or x.get('region')) for x in unique))}


def main():
    p = argparse.ArgumentParser(description='각 정책 HTML 파일에서 개별 목록을 생성')
    p.add_argument('input', type=Path)
    p.add_argument('--title', required=True)
    p.add_argument('--output', required=True, type=Path)
    p.add_argument('--as-of', default=datetime.now(timezone(timedelta(hours=9))).date().isoformat())
    args = p.parse_args()
    content, stats = make_report(args.input, args.title, date.fromisoformat(args.as_of))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding='utf-8')
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == '__main__':
    main()
