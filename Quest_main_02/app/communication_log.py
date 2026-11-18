"""Last confirmed Telegram communication per assistant item and per hour, from local records only."""
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
import hashlib
import json
import sqlite3
from .report_names import dated_title

KST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parents[1]
RECEIPTS = ROOT / 'data' / 'telegram-commands.sqlite3'
MONITOR = ROOT / 'data' / 'job-monitor'
ARTIFACTS = ROOT / 'data' / 'artifacts'
ISSUE_OUT = ROOT / 'output' / 'issue'
POLICY_OUT = ROOT / 'output' / 'policy'
POLICY_MANUAL = ROOT / 'output' / 'policy' / '수동시험'
SERVED = (ARTIFACTS, ISSUE_OUT, POLICY_OUT)
GROUPS = ('지시접수', '분석결과 보고', 'Daily News', '정부정책')
HIDDEN_COMMUNICATION_IDS = frozenset({'74e9700cb2a8'})
KIND_GROUP = {'issue': 'Daily News', 'policy': '정부정책', 'finance': '분석결과 보고', 'ocr': '분석결과 보고',
              'meeting': '분석결과 보고', 'document': '분석결과 보고'}
KIND_LABEL = {'finance': '재무분석', 'ocr': '회의록정리', 'meeting': '회의록정리', 'document': '요약보고서',
              'policy': '정부정책', 'issue': 'Daily News'}
STATUS = {'sent': '전송 확인', 'unknown': '결과 확인 필요', 'too_large': '용량 초과', 'not_attempted': '전송 안 함'}


def _time(value):
    try:
        dt = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    return dt.astimezone(KST) if dt.tzinfo else dt.replace(tzinfo=KST)


def _event(group, t, title, status, demo=False, path=None, text=None, exact=False):
    eid = hashlib.sha1(f'{group}|{t.isoformat()}|{title}'.encode()).hexdigest()[:12]
    return {'id': eid, 'group': group, 'time': t, 'title': title, 'status': status, 'demo': demo,
            'path': path if path and path.is_file() else None, 'text': text, 'exact': exact}


def _monitor_events():
    for log in MONITOR.glob('*-telegram.jsonl'):
        kind = log.name[:-len('-telegram.jsonl')]
        try:
            lines = log.read_text(encoding='utf8').splitlines()
        except (OSError, UnicodeError):
            continue
        for line in lines:
            try:
                row = json.loads(line)
            except ValueError:
                continue
            t, name = _time(row.get('time')), str(row.get('event', ''))
            if not t:
                continue
            path = None
            if kind == 'issue' and 'PDF' in name:
                current = dated_title('Daily News', t) + '.pdf'
                candidates = [ISSUE_OUT/'수시'/f'{t:%Y-%m-%d_%H%M}'/current,
                              ISSUE_OUT/current, ISSUE_OUT/f'Daily_News_{t:%Y-%m-%d}.pdf']
                path = next((f for f in candidates if f.is_file()), None)
            if kind == 'policy' and name == '정부정책 PDF':
                candidate = POLICY_OUT/(dated_title('정부정책_주간보고', t)+'.pdf')
                path = candidate if candidate.is_file() else None
            relative = row.get('file')
            if kind in ('issue', 'policy') and isinstance(relative, str):
                root = ISSUE_OUT if kind == 'issue' else POLICY_OUT
                candidate = (root/relative).resolve()
                if candidate.is_relative_to(root.resolve()) and candidate.is_file():
                    path = candidate
            body = row.get('text') if row.get('status') == 'sent' else None
            exact = isinstance(body, str)
            yield _event(KIND_GROUP.get(kind, '분석결과 보고'), t, name, STATUS.get(row.get('status'), str(row.get('status'))),
                         path=path, exact=exact, text=body if exact else None if path else f'{name} · {t:%Y-%m-%d %H:%M} 텔레그램 발송 기록')


def _artifact_events():
    for record in ARTIFACTS.glob('*/*/*/delivery.json'):
        try:
            data = json.loads(record.read_text(encoding='utf8'))
        except (OSError, ValueError, UnicodeError):
            continue
        t, kind = _time(data.get('created_at')), str(data.get('category'))
        if not t:
            continue
        for f in data.get('files', []):
            name = Path(str(f.get('name', ''))).name
            title = (KIND_LABEL[kind] + ' · ' + name) if kind in KIND_LABEL else name
            yield _event(KIND_GROUP.get(kind, '분석결과 보고'), t, title, STATUS.get(f.get('telegram'), str(f.get('telegram'))),
                         demo=bool(data.get('demo')), path=record.parent / name)


def _issue_log_events():
    """Daily News sends from daily.log, for dates the job-monitor log does not cover."""
    covered = set()
    log = MONITOR / 'issue-telegram.jsonl'
    try:
        for line in log.read_text(encoding='utf8').splitlines():
            t = _time(json.loads(line).get('time'))
            if t:
                covered.add(t.date())
    except (OSError, ValueError, UnicodeError):
        pass
    try:
        lines = (ISSUE_OUT / 'daily.log').read_text(encoding='utf8').splitlines()
    except (OSError, UnicodeError):
        return
    for line in lines:
        parts = line.split()
        if len(parts) < 2 or parts[1] != 'sent':
            continue
        t = _time(parts[0])
        if not t or t.date() in covered:
            continue
        # The file that existed at send time: PDF if already written, else the markdown brief.
        path = None
        for f in (ISSUE_OUT/(dated_title('Daily News', t)+'.pdf'),
                  ISSUE_OUT/f'Daily_News_{t:%Y-%m-%d}.pdf', ISSUE_OUT/f'Daily_News_{t:%Y-%m-%d}.md'):
            if f.is_file() and datetime.fromtimestamp(f.stat().st_mtime, KST) <= t + timedelta(minutes=1):
                path = f
                break
        title = 'Daily News ' + ('PDF' if path and path.suffix == '.pdf' else '본문')
        yield _event('Daily News', t, title, '전송 확인', path=path, text=f'{title} · {t:%Y-%m-%d %H:%M} 발송 기록(daily.log)')


def _policy_manual_events():
    for record in POLICY_MANUAL.glob('정책_*.json'):
        try:
            data = json.loads(record.read_text(encoding='utf8'))
        except (OSError, ValueError, UnicodeError):
            continue
        started = _time(data.get('started'))
        if not started or data.get('logged_in_monitor'):
            continue
        for key, ext, title in (('photo', '.png', '정부정책 요약 이미지'), ('message', '.txt', '정부정책 메시지'), ('pdf', '.pdf', '정부정책 업데이트 PDF')):
            if data.get(key) != 'sent':
                continue
            f = record.with_suffix(ext)
            if key == 'pdf' and isinstance(data.get('pdf_file'), str):
                named = (record.parent/data['pdf_file']).resolve()
                if named.is_relative_to(record.parent.resolve()) and named.suffix == '.pdf':
                    f = named
            t = datetime.fromtimestamp(f.stat().st_mtime, KST).replace(second=0, microsecond=0) if f.is_file() else started
            if key == 'message':
                try:
                    body = f.read_text(encoding='utf8').removesuffix('\n')
                except (OSError, UnicodeError):
                    body = None
                yield _event('정부정책', t, title, '전송 확인', text=body, exact=body is not None)
            else:
                yield _event('정부정책', t, title, '전송 확인', path=f)


def _receipt_events():
    try:
        with closing(sqlite3.connect(RECEIPTS.resolve().as_uri() + '?mode=ro', uri=True, timeout=2)) as db:
            rows = db.execute('SELECT received,text FROM inbound_messages ORDER BY received DESC LIMIT 200').fetchall()
    except sqlite3.Error:
        return
    for stamp, text in rows:
        t = datetime.fromtimestamp(stamp, KST)
        preview = ' '.join(text.split())
        preview = preview[:28] + ('…' if len(preview) > 28 else '')
        yield _event('지시접수', t, '지시 · ' + preview, '수신 확인', text=text)


def _bot_events():
    try:
        import os
        from briefings.policy_weekly import BOT_CONFIG, load_bot
        _, chat = load_bot()
        home = Path(os.environ.get('WORKROOM_HERMES_HOME') or BOT_CONFIG.parent)
        path = home / 'state.db'
        query = '''SELECT m.role, m.content, m.timestamp FROM messages m JOIN sessions s ON s.id=m.session_id
          WHERE s.source='telegram' AND s.chat_type='dm' AND CAST(s.chat_id AS TEXT)=? AND CAST(s.user_id AS TEXT)=?
            AND m.active=1 AND typeof(m.content)='text' AND length(trim(m.content))>0
            AND (m.role='user' OR (m.role='assistant' AND m.finish_reason='stop' AND m.tool_calls IS NULL
                 AND (m.display_kind IS NULL OR m.display_kind!='hidden')))
          ORDER BY m.id DESC LIMIT 200'''
        with closing(sqlite3.connect('file:' + quote(path.as_posix(), safe='/:') + '?mode=ro', uri=True, timeout=2)) as db:
            db.execute('PRAGMA query_only=ON')
            rows = db.execute(query, (str(chat), str(chat))).fetchall()
    except (OSError, ValueError, ImportError, sqlite3.Error):
        return
    for role, content, stamp in rows:
        try:
            t = datetime.fromtimestamp(float(stamp), KST)
        except (TypeError, ValueError, OverflowError, OSError):
            continue
        text = content.strip()
        preview = ' '.join(text.split())
        preview = preview[:28] + ('…' if len(preview) > 28 else '')
        if role == 'user':
            yield _event('지시접수', t, '지시 · ' + preview, '수신 확인', text=text)
        else:
            yield _event('분석결과 보고', t, '비서 응답 · ' + preview, '응답 기록', text=text)


def _all_events(cutoff):
    events = [e for src in (_monitor_events, _issue_log_events, _artifact_events, _policy_manual_events, _bot_events)
              for e in src() if e['time'] < cutoff and e['id'] not in HIDDEN_COMMUNICATION_IDS]
    for receipt in _receipt_events():
        if receipt['time'] >= cutoff or receipt['id'] in HIDDEN_COMMUNICATION_IDS:
            continue
        if any(e['group'] == '지시접수' and e['text'].strip() == receipt['text'].strip()
               and abs(e['time'] - receipt['time']) < timedelta(seconds=60) for e in events):
            continue
        events.append(receipt)
    return sorted(events, key=lambda e: e['time'])


def _public(e):
    item = {k: e[k] for k in ('id', 'group', 'title', 'status', 'demo', 'exact')}
    item['time'] = e['time'].isoformat(timespec='minutes')
    item['link'] = '/api/communication-item?id=' + e['id']
    if e['group'] == '지시접수':
        item['received_text'] = e['text']
    item['kind'] = 'file' if e['path'] else 'text'
    return item


def communication_log(now=None):
    """Latest item per assistant group (real sends first) and today's hourly slots up to the last full hour."""
    now = (now or datetime.now(KST)).astimezone(KST)
    cutoff = now.replace(minute=0, second=0, microsecond=0)
    events = _all_events(now)
    latest = {}
    for g in GROUPS:
        group = [e for e in events if e['group'] == g]
        real = [e for e in group if not e['demo']]
        pool = real or group
        pick = pool[-1] if pool else None
        if pick and not pick['path']:
            # Same send often logs a file and then a notice; link the file.
            files = [e for e in pool if e['path'] and pick['time'] - e['time'] <= timedelta(minutes=5)]
            pick = files[-1] if files else pick
        latest[g] = _public(pick) if pick else None
    groups = {g: [_public(e) for e in reversed(events) if e['group'] == g] for g in GROUPS}
    # Hourly slots, newest first: every hour of today up to the cutoff, and active hours on earlier days.
    slots = {}
    for e in events:
        slots.setdefault((e['time'].date(), e['time'].hour), []).append(_public(e))
    today = cutoff.date()
    keys = set(slots) | {(today, h) for h in range(cutoff.hour + 1)}
    days = {}
    for day, hour in sorted(keys, reverse=True):
        days.setdefault(day, []).append({'hour': f'{hour:02d}:00', 'items': slots.get((day, hour), [])})
    return {'as_of': now.isoformat(timespec='minutes'), 'source': '로컬 발송·봇 기록', 'total': len(events),
            'today_total': sum(1 for e in events if e['time'].date() == today), 'latest': latest, 'groups': groups,
            'days': [{'date': d.isoformat(), 'hours': h} for d, h in days.items()]}


def communication_item(eid, now=None):
    """Return ('file', Path) or ('text', str) for an id listed by communication_log, else None."""
    now = (now or datetime.now(KST)).astimezone(KST)
    for e in _all_events(now):
        if e['id'] != str(eid):
            continue
        if e['path']:
            path = e['path'].resolve()
            if any(path.is_relative_to(base.resolve()) for base in SERVED):
                return 'file', path
            return None
        if e['exact']:
            return 'text', e['text']
        head = f"[{e['group']}] {e['time']:%Y-%m-%d %H:%M} KST · {e['status']}\n\n"
        return 'text', head + (e['text'] or e['title'])
    return None
