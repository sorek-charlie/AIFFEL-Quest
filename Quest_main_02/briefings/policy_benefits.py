"""Render public benefit candidates separately from application announcements."""
import json
from pathlib import Path
from briefings.separate_reports import cell, valid_url


def region(x):
    name=str(x.get('소관기관명') or '').strip()
    kind=str(x.get('소관기관유형') or '').strip()
    if name.startswith('서울특별시') or name=='서울특별시':return '서울 소재 기관'
    if name.startswith('경기도') or name=='경기도':return '경기 소재 기관'
    if kind=='중앙행정기관':return '중앙 기관'
    return '그 밖의 기관·확인 필요'


def save_benefits(items, dest, stamp):
    lines=['# 정부24 공공서비스 혜택 후보','',f'- 수집 시각: {stamp} (한국 시간) · 출처: 행정안전부 / 공공데이터포털',
      f'- 사용자 구분에 법인 또는 소상공인이 포함된 혜택 {len(items):,}건. 개인·복지시설·단체 대상도 함께 포함될 수 있습니다.',
      '- 정책 공고가 아닌 서비스 안내입니다. 신청 자격·기한·지역은 반드시 원문에서 확인하세요.',
      '- 지역 구분은 소관기관 소재를 나타내며 신청 가능 지역을 보장하지 않습니다.','']
    for group in ('서울 소재 기관','경기 소재 기관','중앙 기관','그 밖의 기관·확인 필요'):
        selected=[x for x in items if region(x)==group]
        selected.sort(key=lambda x:str(x.get('수정일시') or ''),reverse=True)
        lines.extend([f'## {group} · {len(selected):,}건','','| 혜택명 | 소관기관 | 사용자 구분 | 신청기한 | 상세 |','| --- | --- | --- | --- | --- |'])
        for x in selected:
            url=valid_url(x.get('상세조회URL'))
            link=f'[원문 열기](<{url}>)' if url else '링크 확인 필요'
            lines.append('| '+' | '.join((cell(x.get('서비스명')),cell(x.get('소관기관명')),cell(x.get('사용자구분')),cell(str(x.get('신청기한') or '')[:180]),link))+' |')
        if not selected:lines.append('| 항목 없음 | — | — | — | — |')
        lines.append('')
    dest.mkdir(parents=True,exist_ok=True)
    (dest/'04_정부24_공공서비스_혜택.md').write_text('\n'.join(lines),encoding='utf8')
    (dest/'정부24_혜택_수집원본.json').write_text(json.dumps({'source':'행정안전부 공공서비스','collected_at_kst':stamp,'items':items},ensure_ascii=False,indent=2),encoding='utf8')
