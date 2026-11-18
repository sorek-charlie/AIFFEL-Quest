"""Weekly Telegram digest using the existing local bot, without polling it."""
import json
import msvcrt
import os
import sqlite3
import sys
import uuid
from collections import Counter
from contextlib import closing
from datetime import date, datetime, time, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener

from briefings.policy_api import NoRedirect
from briefings.policy_jobs import run as run_collection
from briefings.policy_live import DESTINATION, KST, deadline_for, region_for
from briefings.separate_reports import valid_url
from briefings.policy_benefits import region as benefit_region
from briefings.local_model import summarize
from briefings.job_monitor import record, telegram_event

BOT_CONFIG = Path(r'D:\AI_Agent\강의\하네스엔지니어링\하네스 Agent 로컬 llama 텔레그램\.runtime\hermes-home\.env')
DB = DESTINATION / 'weekly-delivery.sqlite3'
SNAPSHOT = DESTINATION / '기업마당_수집원본.json'
BENEFITS = DESTINATION / '정부24_혜택_수집원본.json'
PREVIEW = DESTINATION / '텔레그램_주간_미리보기.txt'
IMAGE_DIR = Path(__file__).resolve().parents[1] / 'output' / 'policy'


def load_bot(path=None):
    if path is None:
        home = os.getenv('WORKROOM_HERMES_HOME')
        if home:
            path = Path(home) / '.env'
        else:
            token, chat, user = (os.getenv(name, '').strip() for name in
                                 ('TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_USER_ID'))
            if token or chat or user:
                if token and chat.isdecimal() and user == chat:
                    return token, chat
                raise ValueError('텔레그램 봇 또는 허용된 개인 수신 대화방 설정을 확인하세요.')
            path = BOT_CONFIG
    config = {}
    for line in path.read_text('utf-8-sig').splitlines():
        if '=' in line and line.strip() and not line.lstrip().startswith('#'):
            k,v = line.split('=',1)
            config[k.strip()] = v.strip().strip('"\'')
    token=config.get('TELEGRAM_BOT_TOKEN','')
    chat=config.get('TELEGRAM_HOME_CHANNEL','')
    allowed=[x.strip() for x in config.get('TELEGRAM_ALLOWED_USERS','').replace(';',',').split(',')]
    if not token or not chat.lstrip('-').isdigit() or chat not in allowed:
        raise ValueError('텔레그램 봇 또는 허용된 개인 수신 대화방 설정을 확인하세요.')
    return token, chat


def recent_notices(document, now):
    if not isinstance(document.get('items'),list):
        raise ValueError('공고 자료가 없습니다.')
    today=now.date()
    start=today-timedelta(days=6)
    candidates=[]
    for item in document['items']:
        region=region_for(item)
        if region not in ('서울','경기','전국'):
            continue
        try:
            published=datetime.fromisoformat(str(item.get('creatPnttm') or item.get('_receipt_start') or '').replace('Z','+00:00')).date()
        except ValueError:
            continue
        deadline=deadline_for(item)
        link=valid_url(item.get('pblancUrl'))
        title=' '.join(str(item.get('pblancNm') or '').split())
        if not title or not link or not start <= published <= today or (deadline and deadline < today):
            continue
        candidates.append((published,deadline,item,link,title))
    candidates.sort(key=lambda x:(x[1] or date.max,x[4]))
    return candidates


def link_message(pairs, empty):
    entries = []
    seen = set()
    length = 0
    for title, url in pairs:
        if url in seen:
            continue
        entry = f'{title}\n{url}'
        size = len(entry.encode('utf-16-le')) // 2 + 2
        if length + size > 4000:
            continue
        entries.append(entry)
        seen.add(url)
        length += size
    return '\n\n'.join(entries) if entries else empty


def policy_message(document, now):
    return link_message(((title, url) for _, _, _, url, title in recent_notices(document, now)),
                        '최근 7일간 조건에 맞는 정책 공고가 없습니다.')


def render_digest(document, now, benefits=None):
    today = now.date()
    start = today - timedelta(days=6)
    candidates = recent_notices(document, now)
    region_counts=Counter(region_for(x[2]) for x in candidates)
    urgent=sum(1 for x in candidates if x[1] and 0<=(x[1]-today).days<=7)
    stamp=str(document.get('collected_at_kst',''))[:16].replace('T',' ')
    source_status=document.get('source_status') or {'기업마당':'성공','K-Startup':'미연결','판판대로':'미연결'}
    lines=['[주간 정부지원사업]', f'기준: {today.isoformat()} · 한국시간',
           f'공고 수집: {stamp or "확인 필요"}',
           '출처별 수집: '+', '.join(f'{k} {v}' for k,v in source_status.items()),
           f'최근 7일 등록 또는 접수 시작 · 서울/경기/전국 표시 공고 {len(candidates)}건 · 마감순',
           f"7일 내 마감 {urgent}건 · 전국 {region_counts['전국']} · 서울 {region_counts['서울']} · 경기 {region_counts['경기']}",
           '지역 미확인 공고는 제외. 지원 자격·접수 여부는 원문 확인.', '']
    for _,deadline,item,link,title in candidates:
        lines.extend([title, f"출처 {item.get('_source') or '기업마당'} · 지역 {region_for(item)} · 마감 {deadline.isoformat() if deadline else '확인 필요'}",link,''])
    if not candidates:
        lines.append('조건에 맞는 공고가 없거나 지역 확인이 필요합니다.')
    if benefits is not None:
        new_benefits=[]
        for x in benefits:
            if benefit_region(x) not in ('서울 소재 기관','경기 소재 기관','중앙 기관'):
                continue
            raw=str(x.get('수정일시') or x.get('등록일시') or '')
            try: updated=datetime.strptime(raw[:8],'%Y%m%d').date()
            except ValueError: continue
            if start<=updated<=today and valid_url(x.get('상세조회URL')) and x.get('서비스명'):
                new_benefits.append((updated,x))
        new_benefits.sort(key=lambda pair:pair[0],reverse=True)
        lines.extend(['','[공공서비스 혜택 후보]',f'중앙·서울·경기 기관의 최근 수정 {len(new_benefits)}건 중 최대 2건 · 지역·신청조건 확인 필요'])
        for _,x in new_benefits[:2]:
            lines.extend(['',str(x['서비스명']),f"소관: {x.get('소관기관명') or '확인 필요'}",valid_url(x['상세조회URL'])])
    return '\n'.join(lines)


def titled_links(message):
    """'제목' 줄 다음 '주소' 줄 쌍을 제목에 링크를 건 텔레그램 HTML로 바꾼다. 주소 줄은 보이지 않는다."""
    from html import escape
    out=[]
    for line in message.split('\n'):
        url=line.strip()
        if valid_url(url) and out and out[-1][1] and not out[-1][0].lstrip().startswith(('<a ','■')):
            title,_=out.pop()
            out.append(('<a href="'+escape(url,quote=True)+'">'+title+'</a>',False))
        else:
            out.append((escape(line,quote=False),bool(line.strip()) and not valid_url(url)))
    return '\n'.join(text for text,_ in out)


def send(message, token, chat, opener=None, links=False):
    payload={'chat_id':chat,'text':titled_links(message) if links else message,'link_preview_options':{'is_disabled':True}}
    if links:payload['parse_mode']='HTML'
    req=Request('https://api.telegram.org/bot'+token+'/sendMessage',data=json.dumps(payload,ensure_ascii=False).encode(),headers={'Content-Type':'application/json'})
    try:
        with (opener or build_opener(NoRedirect())).open(req,timeout=30) as response:
            result=json.load(response)
        if result.get('ok') is not True or not result.get('result',{}).get('message_id'):
            raise ValueError('텔레그램 발송 결과를 확인하지 못했습니다.')
        return str(result['result']['message_id'])
    except (HTTPError,URLError,OSError,json.JSONDecodeError):
        raise ValueError('텔레그램 발송 결과를 확인하지 못했습니다.') from None


def send_photo(path, token, chat, opener=None, caption='주간 정부정책 보고서 · 원문 링크는 이어지는 메시지를 확인해 주세요.'):
    from PIL import Image
    path=Path(path)
    raw=path.read_bytes()
    if not raw or len(raw)>10_000_000:
        raise ValueError('텔레그램 사진 크기를 확인하세요.')
    with Image.open(path) as im:
        w,h=im.size
        if im.format!='PNG' or w+h>10000 or max(w,h)>20*min(w,h):
            raise ValueError('텔레그램 사진 형식을 확인하세요.')
    boundary='----policy'+uuid.uuid4().hex
    prefix=(f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{chat}\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="photo"; filename="weekly-policy.png"\r\nContent-Type: image/png\r\n\r\n').encode('utf-8')
    body=prefix+raw+f'\r\n--{boundary}--\r\n'.encode()
    req=Request('https://api.telegram.org/bot'+token+'/sendPhoto',data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary})
    try:
        with (opener or build_opener(NoRedirect())).open(req,timeout=60) as response:
            result=json.load(response)
        if result.get('ok') is not True or not result.get('result',{}).get('message_id'):
            raise ValueError('텔레그램 이미지 발송 결과를 확인하지 못했습니다.')
        return str(result['result']['message_id'])
    except (HTTPError,URLError,OSError,json.JSONDecodeError):
        raise ValueError('텔레그램 이미지 발송 결과를 확인하지 못했습니다.') from None


def deliver_once(db,table,week,action):
    if table not in ('deliveries','image_deliveries','pdf_deliveries'):
        raise ValueError('잘못된 발송 유형입니다.')
    db.execute(f'CREATE TABLE IF NOT EXISTS {table} (week TEXT PRIMARY KEY,status TEXT NOT NULL,message_id TEXT)')
    try:
        with db: db.execute(f'INSERT INTO {table} VALUES (?, ?, NULL)',(week,'unknown'))
    except sqlite3.IntegrityError:
        status=db.execute(f'SELECT status FROM {table} WHERE week=?',(week,)).fetchone()
        if status and status[0]=='sent':return False
        raise ValueError('이전 발송 결과가 불명확해 중복 전송을 보류합니다. 텔레그램을 확인하세요.')
    message_id=action()
    with db: db.execute(f'UPDATE {table} SET status=?,message_id=? WHERE week=?',('sent',message_id,week))
    return True


def due(now):
    return now.weekday()!=0 or now.time().replace(tzinfo=None)>=time(9,0)


def week_key(now):
    return (now.date()-timedelta(days=now.weekday())).isoformat()


def _run_locked(now):
    now=now or datetime.now(KST)
    if not due(now):
        return 'not_due'
    week=week_key(now)
    start_path=DB.parent/'weekly-start.txt'
    if not start_path.exists():
        first=now.date()+timedelta(days=(-now.weekday())%7)
        start_path.write_text(first.isoformat(),encoding='ascii')
    if week < start_path.read_text(encoding='ascii').strip():
        return 'not_due'
    # On a later logon, catch up the most recent missed Monday once.
    if DB.exists():
        with closing(sqlite3.connect(DB,timeout=10)) as db:
            try:
                if all(db.execute(f'SELECT status FROM {table} WHERE week=?',(week,)).fetchone()==('sent',)
                       for table in ('deliveries','pdf_deliveries')):
                    return 'already_sent'
            except sqlite3.OperationalError:
                pass
    # A stale report is never sent as if it were today's report.
    record('policy-report','오늘 수집 자료 확인',10)
    outcome=run_collection(now)
    if outcome in ('failed','busy'):
        raise ValueError('오늘 공고 수집을 완료하지 못해 발송을 보류합니다.')
    document=json.loads(SNAPSHOT.read_text('utf8'))
    if str(document.get('collected_at_kst',''))[:10]!=now.date().isoformat():
        raise ValueError('오늘 공고 수집 자료가 없어 발송을 보류합니다.')
    benefits=None
    benefit_doc=None
    if document.get('source_status',{}).get('정부24 혜택')=='성공':
        benefit_doc=json.loads(BENEFITS.read_text('utf8'))
        if str(benefit_doc.get('collected_at_kst',''))[:10]==now.date().isoformat(): benefits=benefit_doc.get('items',[])
    archive_dir=DB.parent/'weekly-archive'
    archive_dir.mkdir(parents=True,exist_ok=True)
    archive=archive_dir/f'{week}.json'
    if archive.exists():
        frozen=json.loads(archive.read_text('utf8'))
        document=frozen['document'];benefit_doc=frozen.get('benefit_doc')
        benefits=benefit_doc.get('items',[]) if benefit_doc is not None else None
    else:
        tmp=archive.with_suffix('.tmp')
        tmp.write_text(json.dumps({'document':document,'benefit_doc':benefit_doc if benefits is not None else None},ensure_ascii=False),encoding='utf8')
        tmp.replace(archive)
    IMAGE_DIR.mkdir(parents=True,exist_ok=True)
    text_path=IMAGE_DIR / f"주간_정부정책_{week}.txt"
    if text_path.exists():
        message=text_path.read_text('utf8').strip()
    else:
        message=render_digest(document,now,benefits)
        record('policy-report','로컬 LLM 요약 중',55)
        ai=summarize('공고 제목만 바탕으로 중소기업 경영자가 확인할 점을 두 문장으로 제시하세요. 금액, 자격, 일정은 추정하지 마세요.',
                     '\n'.join(line for line in message.splitlines() if line and not line.startswith('http')))
        message += '\n\n[로컬 AI 검토 메모 · 원문 확인 필요]\n'+ai
        text_path.write_text(message+'\n',encoding='utf8')
    record('policy-report','이미지·PDF 준비',75)
    PREVIEW.write_text(message+'\n',encoding='utf8')
    token,chat=load_bot()
    image_path=IMAGE_DIR / f"주간_정부정책_{week}.png"
    if not image_path.exists():
        from scripts.render_policy_report_image import render
        bdoc=benefit_doc if benefits is not None else None
        image_path.parent.mkdir(parents=True,exist_ok=True)
        tmp=image_path.with_suffix('.tmp')
        render(document,bdoc,now,tmp,preview=False)
        tmp.replace(image_path)
    from app.report_names import dated_title
    title=dated_title('정부정책_주간보고',now)
    pdf_path=IMAGE_DIR / (title+'.pdf')
    if not pdf_path.exists():
        from briefings.report_pdf import create
        create(message,pdf_path,title=title,cover_image=image_path)
    body = policy_message(document, now)
    record('policy-report','텔레그램 발송 확인',90)
    with closing(sqlite3.connect(DB,timeout=10)) as db:
        from app.output_delivery import send_document
        text_sent=deliver_once(db,'deliveries',week,lambda:send(body,token,chat,links=True))
        if text_sent:telegram_event('policy','정부정책 메시지','sent',text=body)
        pdf_sent=deliver_once(db,'pdf_deliveries',week,lambda:send_document(pdf_path.read_bytes(),pdf_path.name,'정부정책 주간 보고 PDF',token,chat))
        if pdf_sent:telegram_event('policy','정부정책 PDF','sent',file=pdf_path)
    record('policy-report','보고 완료' if text_sent or pdf_sent else '기존 발송 확인',100,'complete')
    return 'sent' if text_sent or pdf_sent else 'already_sent'


def run(now=None):
    now=now or datetime.now(KST)
    if not due(now):return 'not_due'
    DB.parent.mkdir(parents=True,exist_ok=True)
    with (DB.parent/'weekly.lock').open('a+b') as lock:
        lock.seek(0)
        try:
            msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:
            return 'busy'
        try:return _run_locked(now)
        except Exception:
            record('policy-report','보고 실패 · 로그 확인',None,'failed')
            raise
        finally:
            lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1)


def main():
    try:
        result=run()
        DESTINATION.mkdir(parents=True,exist_ok=True)
        with (DESTINATION/'weekly.log').open('a',encoding='utf8') as f:
            f.write(datetime.now(KST).isoformat(timespec='seconds')+' '+result+'\n')
        print(result)
    except (OSError,ValueError,KeyError,sqlite3.Error,json.JSONDecodeError) as exc:
        DESTINATION.mkdir(parents=True,exist_ok=True)
        with (DESTINATION/'weekly.log').open('a',encoding='utf8') as f:
            f.write(datetime.now(KST).isoformat(timespec='seconds')+' 실패 '+type(exc).__name__+'; 발송 결과 확인 필요\n')
        print('주간 발송을 완료하지 못했습니다. 로그와 수신 채팅을 확인하세요.',file=sys.stderr)
        return 1
    return 0


if __name__=='__main__':
    raise SystemExit(main())
