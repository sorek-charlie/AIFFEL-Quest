"""Read the authorized personal bot's local conversation record, without polling Telegram."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from contextlib import closing
from urllib.parse import quote
import sqlite3
from briefings.policy_weekly import BOT_CONFIG, load_bot

KST = timezone(timedelta(hours=9))

def read_bot_history(db_path=None, chat_id=None, limit=24):
    use_confirmed_snapshot = db_path is None and chat_id is None
    if chat_id is None:
        _, chat_id = load_bot()
    chat_id = str(chat_id)
    if not chat_id.isdigit():
        raise ValueError('개인 봇 대화 설정을 확인하세요.')
    path = Path(db_path or (BOT_CONFIG.parent / 'state.db'))
    if not path.is_file():
        raise ValueError('봇의 로컬 대화 기록을 찾을 수 없습니다.')
    query = '''SELECT m.role, m.content, m.timestamp FROM messages m
      JOIN sessions s ON s.id=m.session_id
      WHERE s.source='telegram' AND s.chat_type='dm'
        AND CAST(s.chat_id AS TEXT)=? AND CAST(s.user_id AS TEXT)=?
        AND m.active=1 AND typeof(m.content)='text' AND length(trim(m.content))>0
        AND (m.role='user' OR (m.role='assistant' AND m.finish_reason='stop'
             AND m.tool_calls IS NULL AND (m.display_kind IS NULL OR m.display_kind!='hidden')))
      ORDER BY m.id DESC LIMIT ?'''
    with closing(sqlite3.connect('file:' + quote(path.as_posix(), safe='/:') + '?mode=ro', uri=True, timeout=2)) as db:
        db.execute('PRAGMA query_only=ON')
        rows = db.execute(query, (chat_id, chat_id, max(1,min(int(limit),50)))).fetchall()
    messages=[]
    for role, content, timestamp in reversed(rows):
        try:
            dt=datetime.fromtimestamp(float(timestamp),KST).isoformat(timespec='minutes')
        except (TypeError, ValueError, OverflowError, OSError):
            dt=None
        content=content.strip()
        if len(content)>2500:
            content=content[:2500]+'\n… (일부 생략)'
        messages.append({'role':role,'text':content,'time':dt})
    snapshot=None
    if use_confirmed_snapshot:
        source=Path(__file__).resolve().parents[1]/'output'/'policy'/'수동시험'/'정책_20261117-161250.txt'
        try:
            text=source.read_text(encoding='utf8')
            start=text.find('[공공서비스 혜택 후보]')
            if start>=0 and '[로컬 AI 검토 메모' in text[start:]:
                snapshot={'time':'2026-11-17T16:13:00+09:00','text':text[start:start+3000]}
        except (OSError,UnicodeError):pass
    return {'status':'partial','source':'허용된 비서 봇의 로컬 기록','confirmed_snapshot':snapshot,
            'observed_at':datetime.now(KST).isoformat(timespec='seconds'),
            'latest_at':messages[-1]['time'] if messages else None,
            'messages':messages}
