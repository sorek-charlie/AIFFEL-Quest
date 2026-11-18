"""Read the user's saved policy HTML as data; never execute its JavaScript."""
import argparse
import html
import json
import re
from datetime import datetime, date, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

class EmbeddedData(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.active = False
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'script' and dict(attrs).get('id') == 'briefing-data':
            self.active = True
    def handle_endtag(self, tag):
        if tag.lower() == 'script' and self.active:
            self.active = False
    def handle_data(self, data):
        if self.active:
            self.parts.append(data)

def scan(path, as_of, view='new'):
    raw = Path(path).read_bytes()
    if len(raw)>15_000_000: raise ValueError('HTML 파일은 15MB 이하여야 합니다.')
    parser=EmbeddedData();parser.feed(raw.decode('utf-8-sig'))
    if not parser.parts: raise ValueError('지원사업 데이터가 담긴 briefing-data를 찾지 못했습니다.')
    content=json.loads(''.join(parser.parts));section=content.get(view,{})
    items=section.get('items',[])
    if not isinstance(items,list): raise ValueError('지원사업 목록 형식이 올바르지 않습니다.')
    today=date.fromisoformat(as_of);selected=[];expired=0
    for item in items:
        if not isinstance(item,dict): continue
        region=str(item.get('regionMajor') or item.get('region') or '').strip()
        if region not in ('전국','경기','서울'): continue
        deadline=str(item.get('applyEnd') or '').strip()
        try: d=date.fromisoformat(deadline) if deadline else None
        except ValueError: d=None
        if d is not None and d<today:
            expired+=1;continue
        link=str(item.get('detailUrl') or '').strip();u=urlparse(link)
        if u.scheme not in ('http','https') or not u.hostname: link=''
        selected.append({'title':str(item.get('title') or '').strip(), 'region':region,
            'category':str(item.get('bizType') or '').strip(), 'organization':str(item.get('organization') or '').strip(),
            'deadline':deadline or None, 'url':link, 'published':str(item.get('pubDate') or ''),
            'new':bool(item.get('isNew')), 'eligibility':'원문 확인 필요', 'source_checked':False})
    selected.sort(key=lambda x:(not bool(x['deadline']),x['deadline'] or '',x['title']))
    return {'snapshot':True,'as_of':as_of,'view':view,'total_in_view':len(items),'expired_excluded':expired,'items':selected}

def page(data):
    out=['<!doctype html><html lang="ko"><meta charset="utf-8"><title>정책 스캔 결과</title>',
         '<style>body{font:16px/1.6 system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#18232e}article{border-bottom:1px solid #d7dee5;padding:20px 0}a{color:#245a9a}small{color:#526374}</style>',
         '<h1>정부정책 스냅샷 스캔</h1>',f'<p>기준일 {html.escape(data["as_of"])} · 전국·서울·경기 · 검색 결과 {len(data["items"])}건</p>',
         '<p>저장된 과거 HTML의 자료입니다. 원문을 확인하기 전까지 지원 자격·일정의 최신성을 보장하지 않습니다.</p>']
    for item in data['items']:
        out.append('<article><h2>'+html.escape(item['title'])+'</h2>')
        out.append('<p>'+html.escape(item['region'])+' · '+html.escape(item['category'])+' · '+html.escape(item['organization'])+'</p>')
        out.append('<p>신청기한: '+html.escape(item['deadline'] or '확인 필요')+' · 지원대상: 원문 확인 필요</p>')
        if item['url']: out.append('<p><a rel="noreferrer noopener" href="'+html.escape(item['url'],quote=True)+'">공고 원문 열기</a></p>')
        else: out.append('<p>원문 링크 확인 필요</p>')
        out.append('</article>')
    return '\n'.join(out)+ '</html>'

def main():
    p=argparse.ArgumentParser();p.add_argument('input',type=Path);p.add_argument('--as-of',default=datetime.now(timezone(timedelta(hours=9))).date().isoformat());p.add_argument('--view',choices=('new','all'),default='new');p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    result=scan(a.input,a.as_of,a.view);a.output.write_text(page(result),encoding='utf-8');print(f"스냅샷 {result['total_in_view']}건 중 {len(result['items'])}건 표시, 마감 {result['expired_excluded']}건 제외. 원문 미검증.")
if __name__=='__main__':main()
