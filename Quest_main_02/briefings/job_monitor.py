"""Local, non-sensitive status records for scheduled report jobs."""
import json
import os
import sqlite3
from collections import deque
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONITOR=ROOT/'data'/'job-monitor'
KST=timezone(timedelta(hours=9))
LOG_LIMIT=30
TASKS={'issue','issue-collection','policy-collection','policy-report'}

def record(task, stage, percent=None, status='running'):
    if task not in TASKS:return
    try:
        MONITOR.mkdir(parents=True,exist_ok=True)
        item={'task':task,'stage':str(stage)[:120],'percent':percent,'status':status,
              'updated_at':datetime.now(KST).isoformat(timespec='seconds')}
        path=MONITOR/(task+'.json');tmp=MONITOR/(task+'.'+str(os.getpid())+'.tmp')
        tmp.write_text(json.dumps(item,ensure_ascii=False),encoding='utf8');os.replace(tmp,path)
    except OSError:
        pass

def telegram_event(kind, event, status, *, file=None, text=None):
    if kind not in ('issue','policy'):return
    try:
        MONITOR.mkdir(parents=True,exist_ok=True)
        item={'time':datetime.now(KST).isoformat(timespec='seconds'),'event':str(event)[:80],'status':status}
        if status == 'sent' and text is not None:
            item['text'] = text
        if file is not None:
            path = Path(file).resolve()
            output = (ROOT/'output'/kind).resolve()
            if path.is_relative_to(output):
                item['file'] = path.relative_to(output).as_posix()
        with (MONITOR/(kind+'-telegram.jsonl')).open('a',encoding='utf8') as f:f.write(json.dumps(item,ensure_ascii=False)+'\n')
    except OSError:
        pass

def state(task):
    try:
        item=json.loads((MONITOR/(task+'.json')).read_text(encoding='utf8'))
        if item.get('task')!=task or item.get('status') not in ('running','complete','failed','partial','pending'):return None
        percent=item.get('percent')
        if percent is not None and (not isinstance(percent,(int,float)) or not 0<=percent<=100):return None
        if item['status']=='running':
            updated=datetime.fromisoformat(item['updated_at'])
            if datetime.now(KST)-updated > timedelta(minutes=15):item['status']='unknown'
        return {k:item.get(k) for k in ('task','stage','percent','status','updated_at')}
    except (OSError, ValueError, TypeError, KeyError):return None

def historical_state(task):
    """Use existing job logs as dated history, without inventing a percentage."""
    try:
        if task=='policy-collection':
            data=json.loads((ROOT/'data'/'policy-live'/'collection-state.json').read_text(encoding='utf8'))
            if not data.get('time'):return None
            return {'task':task,'stage':'최근 수집 완료 · '+str(data.get('count','확인 필요'))+'건','percent':None,'status':'complete','updated_at':data['time']}
        if task=='issue':
            with (ROOT/'output'/'issue'/'daily.log').open(encoding='utf8') as f:lines=deque(f,maxlen=1)
            if not lines:return None
            parts=lines[-1].split()
            if len(parts)<2:return None
            datetime.fromisoformat(parts[0])
            status=parts[1]
            if status not in ('sent','already_sent','failed'):return None
            return {'task':task,'stage':{'sent':'최근 보고 발송 완료','already_sent':'기존 발송 확인','failed':'최근 작업 실패'}[status], 'percent':None,'status':'failed' if status=='failed' else 'complete','updated_at':parts[0]}
    except (OSError,ValueError,TypeError,KeyError):pass
    return None

def communication(kind):
    items=[];legacy=[]
    try:
        with (MONITOR/(kind+'-telegram.jsonl')).open(encoding='utf8') as f:
            for line in deque(f,maxlen=LOG_LIMIT):
                try:
                    row=json.loads(line)
                    if isinstance(row,dict) and all(k in row for k in ('time','event','status')):
                        items.append({k:str(row[k])[:100] for k in ('time','event','status')})
                except (ValueError,TypeError):pass
    except OSError:pass
    # Older deliveries were recorded before the event log existed; show only delivery metadata.
    dbpath=(ROOT/'output'/'issue'/'daily-delivery.sqlite3') if kind=='issue' else (ROOT/'data'/'policy-live'/'weekly-delivery.sqlite3')
    if dbpath.is_file():
        try:
            from urllib.parse import quote
            with closing(sqlite3.connect('file:'+quote(dbpath.as_posix(),safe='/:')+'?mode=ro',uri=True,timeout=1)) as db:
                if kind=='issue':
                    rows=db.execute('SELECT date,kind,status FROM deliveries ORDER BY date DESC LIMIT 8').fetchall()
                    for date,typ,result in reversed(rows):legacy.append({'time':str(date),'event':'PDF' if typ=='pdf' else '보고 알림','status':str(result)})
                else:
                    for table,label in (('deliveries','보고 메시지'),('image_deliveries','이미지'),('pdf_deliveries','PDF')):
                        try:rows=db.execute(f'SELECT week,status FROM {table} ORDER BY week DESC LIMIT 3').fetchall()
                        except sqlite3.Error:continue
                        for week,result in reversed(rows):legacy.append({'time':str(week),'event':label,'status':str(result)})
        except (sqlite3.Error,OSError,ValueError):pass
    # 선입선출: 화면은 최신 기록을 맨 위에 쌓고, 한도를 넘으면 가장 오래된(맨 아래) 기록부터 빠진다.
    return sorted(legacy+items,key=lambda x:x['time'])[-LOG_LIMIT:]

def snapshot(kind):
    if kind not in ('issue','policy'):raise ValueError('보고 종류를 확인하세요.')
    from briefings.local_model import healthy
    return {'kind':kind,'model_running':healthy(),
            'jobs':[
                state('issue-collection') or {'task':'issue-collection','stage':'수집 기록 없음','status':'pending'},
                state('issue') or historical_state('issue') or {'task':'issue','stage':'보고 기록 없음','status':'pending'},
            ] if kind=='issue' else [x for x in (state('policy-collection') or historical_state('policy-collection'),state('policy-report')) if x],
            'telegram':communication(kind),'checked_at':datetime.now(KST).isoformat(timespec='seconds')}
