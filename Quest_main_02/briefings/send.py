"""Send one prepared report. No scheduler, source collection or retry is installed."""
import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen
from .render import checked_url, line, render

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / 'data' / 'briefing-delivery.sqlite3'

def deliver(kind, document, token, chat_id, db_path=DB_PATH, opener=urlopen):
    if document.get('fixture'):
        raise ValueError('가상 예시는 발송할 수 없습니다.')
    if not document.get('items'):
        raise ValueError('항목이 없는 보고서는 발송하지 않습니다.')
    if not token or not chat_id:
        raise ValueError('TELEGRAM_BOT_TOKEN과 TELEGRAM_CHAT_ID 환경변수가 필요합니다.')
    message = render(kind, document)
    if any(x.get('source_checked') is not True for x in document['items']):
        raise ValueError('원문 대조가 확인되지 않은 항목이 있습니다.')
    if any(not line(x.get('source')) or not checked_url(x.get('url')) for x in document['items']):
        raise ValueError('출처 또는 유효한 원문 링크가 없는 항목이 있습니다.')
    if document.get('source_failures'):
        raise ValueError('수집 실패 출처가 있어 발송을 보류합니다. 부분 발송 정책은 미결정입니다.')
    # The durable pre-send record prevents automatic duplicates after an ambiguous timeout.
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(db_path), timeout=10)
    try:
        db.execute('CREATE TABLE IF NOT EXISTS deliveries (kind TEXT NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, message_id TEXT, PRIMARY KEY(kind, day))')
        try:
            with db:
                db.execute('INSERT INTO deliveries VALUES (?, ?, ?, ?, NULL)', (kind, document['as_of'], 'unknown', datetime.now(timezone.utc).isoformat()))
        except sqlite3.IntegrityError as exc:
            raise ValueError('이미 발송했거나 발송 결과를 확인해야 하는 보고서입니다.') from exc
        payload = json.dumps({'chat_id': chat_id, 'text': message, 'link_preview_options': {'is_disabled': True}}, ensure_ascii=False).encode('utf-8')
        req = Request(f'https://api.telegram.org/bot{token}/sendMessage', payload, {'Content-Type': 'application/json'})
        try:
            with opener(req, timeout=20) as response:
                result = json.load(response)
            if result.get('ok') is not True or 'message_id' not in result.get('result', {}):
                raise ValueError('Telegram 응답을 확인하지 못했습니다. 채팅 확인 후 처리하세요.')
            msg_id = str(result['result']['message_id'])
        except (OSError, URLError, json.JSONDecodeError) as exc:
            raise ValueError('발송 결과를 확인하지 못했습니다. 텔레그램 채팅과 발송 기록을 확인하세요.') from exc
        with db:
            db.execute('UPDATE deliveries SET status=?,message_id=? WHERE kind=? AND day=?', ('sent', msg_id, kind, document['as_of']))
        return msg_id
    finally:
        db.close()

def main():
    p = argparse.ArgumentParser(description='검토한 정기 보고서를 Telegram에 한 번 보냅니다.')
    p.add_argument('--kind', required=True, choices=('policy', 'issue'))
    p.add_argument('--input', required=True, type=Path)
    args = p.parse_args()
    try:
        doc = json.loads(args.input.read_text(encoding='utf-8'))
        msg_id = deliver(args.kind, doc, os.getenv('TELEGRAM_BOT_TOKEN'), os.getenv('TELEGRAM_CHAT_ID'))
        print(f'발송 완료. Telegram message_id: {msg_id}')
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'발송 중단: {exc}', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
