"""Render normalized policy or issue items for Telegram, without sending.

Run: python -m briefings.render --kind policy --input examples/policy.json
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

TOPICS = ('AI', '경제', '정치', '사회', '기술', '주식')
MAX_LENGTH = 3800

def line(value):
    return ' '.join(str(value).split()) if value is not None else ''

def checked_url(value):
    value = line(value)
    parsed = urlparse(value)
    return value if parsed.scheme in ('http', 'https') and parsed.hostname else ''

def render(kind, document):
    if not isinstance(document, dict) or not isinstance(document.get('items'), list):
        raise ValueError('items 배열이 있는 JSON 객체가 필요합니다.')
    if kind not in ('policy', 'issue'):
        raise ValueError('지원하지 않는 보고 유형입니다.')
    date.fromisoformat(document['as_of'])
    intro = '[주간 정부정책 브리핑]' if kind == 'policy' else '[오늘의 이슈 브리핑]'
    lines = [intro, f"기준일: {document['as_of']} · 한국 시간", '']
    if document.get('fixture'):
        lines.extend(['※ 가상 예시 — 실제 정책·기사 아님', ''])
    if kind == 'policy':
        lines.extend(['대상: 중소기업 · 서울·경기 중심', ''])
    else:
        lines.extend(['분야: ' + ' · '.join(TOPICS), ''])
    for i, item in enumerate(document['items'], 1):
        if not isinstance(item, dict) or not line(item.get('title')):
            raise ValueError(f'{i}번째 항목에 제목이 필요합니다.')
        source = line(item.get('source'))
        url = checked_url(item.get('url'))
        summary = line(item.get('summary'))
        lines.append(f"{i}. {line(item['title'])}")
        if kind == 'policy':
            lines.append(f"대상·지역: {line(item.get('eligibility')) or '원문 확인 필요'}")
            lines.append(f"접수 기한: {line(item.get('deadline')) or '원문 확인 필요'}")
            lines.append(f"지원 내용: {summary or '원문 확인 필요'}")
        else:
            topic = line(item.get('topic'))
            if topic not in TOPICS:
                raise ValueError(f'{i}번째 항목의 분야가 올바르지 않습니다.')
            lines.extend([f'분야: {topic}', f"요약: {summary or '원문 확인 필요'}"])
            lines.append(f"게시 시각: {line(item.get('published_at')) or '원문 확인 필요'}")
        lines.append(f"출처: {source or '확인 필요'}")
        lines.append(f"원문: {url or '확인 필요'}")
        if item.get('source_checked') is not True or not url or not source:
            lines.append('검증: 원문 대조 필요')
        else:
            lines.append('검증: 입력 단계에서 원문 대조 표시')
        lines.append('')
    if not document['items']:
        lines.extend(['표시할 항목이 없습니다. 출처와 수집 상태를 확인하세요.', ''])
    failures = document.get('source_failures', [])
    if not isinstance(failures, list):
        raise ValueError('source_failures는 배열이어야 합니다.')
    lines.append('수집 실패: ' + (', '.join(line(x) for x in failures) if failures else '기록 없음'))
    if kind == 'policy':
        lines.append('지원 자격·금액·마감일은 공고 원문에서 다시 확인하세요.')
    else:
        lines.append('사실과 해석을 구분하고 원문을 확인하세요.')
    result = '\n'.join(lines)
    if len(result) > MAX_LENGTH:
        raise ValueError('메시지가 3,800자를 초과합니다. 항목을 나누거나 축약해 주세요.')
    return result

def main():
    parser = argparse.ArgumentParser(description='텔레그램 메시지 미리보기 생성 (발송하지 않음)')
    parser.add_argument('--kind', required=True, choices=('policy', 'issue'))
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        doc = json.loads(args.input.read_text(encoding='utf-8'))
        result = render(args.kind, doc)
        if args.output:
            args.output.write_text(result + '\n', encoding='utf-8')
        else:
            print(result)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'보고서 생성 실패: {exc}', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
