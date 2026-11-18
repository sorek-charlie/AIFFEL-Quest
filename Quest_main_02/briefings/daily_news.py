"""Daily, source-linked news report using public RSS titles and a local model."""
import json
import msvcrt
import re
import sqlite3
import sys
import time as clock
import xml.etree.ElementTree as ET
from contextlib import closing
from datetime import datetime, time, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

from app.output_delivery import send_document
from app.report_names import dated_title
from briefings.local_model import summarize
from briefings.job_monitor import record, telegram_event
from briefings.policy_live import KST
from briefings.policy_weekly import link_message, load_bot, send

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'/'issue'
DB=OUT/'daily-delivery.sqlite3'
QUERIES={'AI':'인공지능 AI','경제':'한국 경제','정치':'한국 정치','사회':'한국 사회','기술':'기술 산업','주식':'한국 주식 증시'}


def fetch(query, now):
    url='https://www.bing.com/news/search?'+urlencode({'q':query,'format':'rss','setlang':'ko-KR','cc':'KR'})
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as response:
        raw=response.read(2_000_001)
    if len(raw)>2_000_000: raise ValueError('뉴스 피드가 너무 큽니다.')
    root=ET.fromstring(raw)
    items=[]
    for entry in root.findall('./channel/item'):
        title=' '.join((entry.findtext('title') or '').split())
        raw_link=entry.findtext('link') or ''
        link=parse_qs(urlparse(raw_link).query).get('url',[raw_link])[0]
        if urlparse(link).scheme not in ('http','https') or not urlparse(link).hostname: continue
        try: published=parsedate_to_datetime(entry.findtext('pubDate')).astimezone(KST)
        except (ValueError,TypeError,OverflowError): continue
        if not now-timedelta(hours=36)<=published<=now+timedelta(minutes=5): continue
        if title and not any(x['title']==title for x in items):
            items.append({'title':title,'url':link,'source':urlparse(link).hostname,'published':published.isoformat(timespec='minutes')})
        if len(items)>=5: break
    return items


def create_report(now, fetcher=fetch, model=summarize, progress=None, collection_progress=None):
    groups={}; errors=[]
    for index,(name,query) in enumerate(QUERIES.items()):
        if collection_progress:collection_progress(f'{name} 뉴스 수집 중', index*100//len(QUERIES))
        try: groups[name]=fetcher(query,now)
        except (OSError,ValueError,ET.ParseError): groups[name]=[];errors.append(name)
    if not any(groups.values()):
        if collection_progress:collection_progress('뉴스 수집 실패', None, 'failed')
        raise ValueError('뉴스를 수집하지 못했습니다.')
    if collection_progress:
        status = 'partial' if errors else 'complete'
        stage = '일부 출처 수집 실패' if errors else '뉴스 수집 완료'
        collection_progress(stage, 100, status)
    lines=['# Daily News',f'작성 {now:%Y-%m-%d %H:%M} KST',
           'AI·경제·정치·사회·기술·주식 | 기사 제목 기반, 원문 확인 필요',
           '수집 실패: '+(', '.join(errors) if errors else '없음'),'']
    titles=[]
    for category,items in groups.items():
        lines+=['## '+category]
        if not items: lines+=['수집된 기사가 없습니다.',''];continue
        for i,item in enumerate(items,1):
            lines += [f"{i}. {item['title']}",f"   {item['source']} · {item['published']}",f"   {item['url']}"]
            titles.append(f"[{category}] {item['title']}")
        lines.append('')
    if progress:progress('로컬 LLM 요약 중', 20)
    ai=model('다음 기사 제목을 근거로 경영진이 확인할 흐름을 최대 3문장으로 요약하세요. 특정 업종·조사·지역의 결과를 전체 산업이나 모든 기업의 사실로 일반화하지 마세요. 기사 본문은 제공되지 않았으므로 제목 밖의 사실, 수치, 인과관계를 추정하지 마세요.', '\n'.join(titles))
    lines[4:4]=['## 로컬 AI 한눈에 보기','제목을 바탕으로 작성한 참고 메모입니다.','',*('> '+line for line in ai.splitlines()),'']
    return '\n'.join(lines)+'\n'


def create_monitored_report(now):
    record('issue', '뉴스 수집 대기', 0, 'pending')
    record('issue-collection', '뉴스 수집 시작', 0)
    return create_report(
        now,
        progress=lambda stage, percent: record('issue', stage, percent),
        collection_progress=lambda stage, percent, status='running':
            record('issue-collection', stage, percent, status),
    )


PER_CATEGORY = 2  # 문자에는 분야별 상위 기사만 싣고 전체 목록은 PDF로 본다.
LIMIT = 4000      # 텔레그램 4096자(UTF-16) 한도 아래로 유지


def _size(text):
    return len(text.encode('utf-16-le')) // 2


def news_message(report, label=''):
    """PDF 내용 중 로컬 AI 메모와 분야별 상위 기사 제목·원문 링크를 문자로 만든다."""
    when = re.search(r'^작성 (\d{4}-\d{2}-\d{2} \d{2}:\d{2})', report, re.M)
    head = f"[Daily News{' · ' + label if label else ''}]" + (f' {when.group(1)} 기준' if when else '')
    section = re.search(r'^## 로컬 AI 한눈에 보기\n(.*?)(?=^## |\Z)', report, re.M | re.S)
    memo = [line.removeprefix('> ').strip() for line in (section.group(1) if section else '').splitlines()
            if line.strip() and not line.startswith('제목을 바탕으로')]
    parts = [head]
    if memo:
        parts.append('로컬 AI 메모 (기사 제목 기반 · 원문 확인 필요)\n' + '\n'.join(memo))
    used = _size('\n\n'.join(parts))
    seen = set()
    count = 0
    for category, body in re.findall(r'^## ([^\n]+)\n(.*?)(?=^## |\Z)', report, re.M | re.S):
        if category.strip() == '로컬 AI 한눈에 보기':
            continue
        entries = []
        for title, url in re.findall(r'^\d+\. ([^\n]+)\n   [^\n]+\n   (https?://\S+)$', body, re.M):
            if url in seen or len(entries) >= PER_CATEGORY:
                continue
            entries.append(f'{title}\n{url}')
            seen.add(url)
        if not entries:
            continue
        block = f'■ {category.strip()}\n' + '\n'.join(entries)
        if used + _size(block) + 2 > LIMIT:
            continue
        parts.append(block)
        used += _size(block) + 2
        count += len(entries)
    if not count:
        parts.append('링크를 확인할 수 있는 기사가 없습니다.')
    else:
        parts.append('전체 기사 목록은 첨부 PDF에서 확인하세요.')
    return '\n\n'.join(parts)


def send_news(report, token, chat, label=''):
    body = news_message(report, label)
    send(body, token, chat, links=True)
    telegram_event('issue', 'Daily News 메시지', 'sent', text=body)


def deliver(db, date_key, kind, action):
    db.execute('CREATE TABLE IF NOT EXISTS deliveries (date TEXT,kind TEXT,status TEXT,PRIMARY KEY(date,kind))')
    try:
        with db: db.execute('INSERT INTO deliveries VALUES (?,?,?)',(date_key,kind,'unknown'))
    except sqlite3.IntegrityError:
        row=db.execute('SELECT status FROM deliveries WHERE date=? AND kind=?',(date_key,kind)).fetchone()
        if row==('sent',):return False
        raise ValueError('이전 텔레그램 발송 결과가 불명확해 중복 발송을 보류했습니다.')
    action()
    with db: db.execute('UPDATE deliveries SET status=? WHERE date=? AND kind=?',('sent',date_key,kind))
    return True


def run(now=None):
    now=now or datetime.now(KST)
    if now.time().replace(tzinfo=None)<time(9):return 'not_due'
    OUT.mkdir(parents=True,exist_ok=True)
    with (OUT/'daily.lock').open('a+b') as lock:
        try: lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:return 'busy'
        try:
            date_key=now.date().isoformat();path=OUT/f'Daily_News_{date_key}.md'
            if DB.is_file():
                with closing(sqlite3.connect(DB,timeout=10)) as db:
                    exists=db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='deliveries'").fetchone()
                    if exists and db.execute("SELECT count(*) FROM deliveries WHERE date=? AND kind IN ('pdf','notice') AND status='sent'",(date_key,)).fetchone()[0]==2:
                        return 'already_sent'
            if not path.exists():
                result=create_monitored_report(now)
                tmp=path.with_suffix('.tmp');tmp.write_text(result,encoding='utf8');tmp.replace(path)
            record('issue','보고서 PDF 준비',75)
            title=dated_title('Daily News',now)
            pdf=OUT/(title+'.pdf')
            if not pdf.exists():
                from briefings.report_pdf import create
                create(path.read_text('utf8'),pdf,title=title)
            token,chat=load_bot()
            record('issue','텔레그램 발송 확인',90)
            with closing(sqlite3.connect(DB,timeout=10)) as db:
                new=deliver(db,date_key,'pdf',lambda:send_document(pdf.read_bytes(),pdf.name,'Daily News PDF · 원문 링크 포함',token,chat))
                if new:telegram_event('issue','Daily News PDF','sent',file=pdf)
                notice=deliver(db,date_key,'notice',lambda:send_news(path.read_text('utf8'),token,chat))
            record('issue','보고 완료' if new or notice else '기존 발송 확인',100,'complete')
            return 'sent' if new or notice else 'already_sent'
        except Exception:
            record('issue','작업 실패 · 로그 확인',None,'failed')
            raise
        finally:
            lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1)


def main():
    started=clock.monotonic()
    try:
        result=run();print(result)
    except Exception as exc:
        result='failed '+type(exc).__name__;print('일일 뉴스 실패: 로컬 AI, 인터넷 및 발송 상태를 확인하세요.',file=sys.stderr)
    OUT.mkdir(parents=True,exist_ok=True)
    with (OUT/'daily.log').open('a',encoding='utf8') as log:log.write(datetime.now(KST).isoformat(timespec='seconds')+' '+result+' '+str(round(clock.monotonic()-started,1))+'s\n')
    return 1 if result.startswith('failed') or result=='busy' else 0


if __name__=='__main__':raise SystemExit(main())
