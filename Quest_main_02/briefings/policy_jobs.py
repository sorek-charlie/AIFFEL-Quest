"""Local scheduled collection. Each due calendar day is committed only on success."""
import json
import msvcrt
import sys
from datetime import datetime, time
from pathlib import Path

from briefings.policy_live import KST, DESTINATION, collect, save_reports
from briefings.windows_secret import load
from briefings.policy_sources import gov24_benefits, kstartup, panpandaero
from briefings.policy_benefits import save_benefits
from briefings.job_monitor import record

STATE = DESTINATION / 'collection-state.json'
LOCK = DESTINATION / 'collection.lock'
LOG = DESTINATION / 'collection.log'


def log(message):
    DESTINATION.mkdir(parents=True, exist_ok=True)
    with LOG.open('a', encoding='utf8') as f:
        f.write(datetime.now(KST).isoformat(timespec='seconds') + ' ' + message + '\n')


def due(now, state):
    return now.time().replace(tzinfo=None) >= time(8, 30) and (state.get('last_success_date') != now.date().isoformat() or state.get('sources_version') != 4)


def run(now=None, force=False):
    now = now or datetime.now(KST)
    DESTINATION.mkdir(parents=True, exist_ok=True)
    with LOCK.open('a+b') as lock:
        lock.seek(0)
        try:
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            log('다른 수집 작업이 실행 중이므로 건너뜀')
            return 'busy'
        try:
            if STATE.exists():
                state = json.loads(STATE.read_text('utf8'))
            else:
                state = {}
            if not force and not due(now,state):
                log('오늘 수집 전 시간이거나 이미 성공했음')
                return 'not_due'
            record('policy-collection','기업마당 API 수집 중',10)
            key=load()
            items, stats = collect(key)
            statuses={'기업마당':'성공'}
            source_counts={'기업마당':len(items)}
            for index,(name, fetch) in enumerate((('K-Startup',lambda:kstartup(key)),('판판대로',lambda:panpandaero(key,now.year)))):
                record('policy-collection',name+' API 수집 중',35+index*20)
                try:
                    extra=fetch(); items.extend(extra); statuses[name]='성공'; source_counts[name]=len(extra)
                except (OSError,ValueError,KeyError,TypeError):
                    statuses[name]='수집 실패'; source_counts[name]=0
            record('policy-collection','정부24 혜택 수집 중',75)
            try:
                benefits=gov24_benefits(key)
                save_benefits(benefits,DESTINATION,now.isoformat())
                statuses['정부24 혜택']='성공';source_counts['정부24 혜택']=len(benefits)
            except (OSError,ValueError,KeyError,TypeError):
                statuses['정부24 혜택']='수집 실패';source_counts['정부24 혜택']=0
            stats={'sources':source_counts, 'bizinfo':stats}
            result = save_reports(items,stats,now=now,source_status=statuses)
            if any(x!='성공' for x in statuses.values()):
                record('policy-collection','일부 출처 수집 실패',None,'partial')
                log('일부 출처 수집 실패; 성공 자료만 표시하고 다음 실행 때 재시도')
                return 'partial'
            temp = STATE.with_suffix('.tmp')
            temp.write_text(json.dumps({'last_success_date':now.date().isoformat(),'time':now.isoformat(),'count':len(items),'sources_version':4},ensure_ascii=False),encoding='utf8')
            temp.replace(STATE)
            record('policy-collection','수집 완료',100,'complete')
            log(f"네 출처 수집 완료: 공고 {result['total']}건, 혜택 {source_counts['정부24 혜택']}건")
            return 'collected'
        except Exception as exc:
            # Never log the raw exception: URLs can include the secret key.
            record('policy-collection','수집 실패 · 로그 확인',None,'failed')
            log(f'수집 실패 ({type(exc).__name__}); 다음 실행 때 재시도')
            return 'failed'
        finally:
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)


if __name__ == '__main__':
    outcome=run()
    print(outcome)
    sys.exit(1 if outcome in ('failed','partial') else 0)
