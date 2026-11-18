"""Workroom worker invoked by the personal Telegram gateway, without a second poller."""
import json
import os
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

from briefings.policy_weekly import load_bot, send
from .output_delivery import summary
from .telegram_reports import MEDIA_LIMIT, execute_report, parse_report

ROOT = Path(__file__).resolve().parents[1]


def admit(message_id):
    database = ROOT / 'data' / 'telegram-commands.sqlite3'
    with closing(sqlite3.connect(database)) as connection, connection:
        connection.execute('CREATE TABLE IF NOT EXISTS report_commands (id TEXT PRIMARY KEY)')
        return connection.execute('INSERT OR IGNORE INTO report_commands VALUES (?)', (message_id,)).rowcount == 1


def main():
    request = json.load(sys.stdin)
    token, chat = load_bot()
    if str(request['chat']) != chat or str(request['user']) != chat:
        return 2
    files = request.get('files') or []
    command = parse_report(request['text'], bare=not files)
    if command is None:
        return 3
    kind, subject = command
    filing = None
    if kind == 'bare':
        from .dart_finance import annual_filing
        try:
            filing = annual_filing(subject)
        except ValueError:
            return 3
        if not filing:
            return 3
        kind = 'brief'
    message_id = str(request.get('message_id') or '')
    if message_id and not admit(message_id):
        return 0
    try:
        paths = [Path(path).resolve(strict=True) for path in files] if kind != 'brief' else []
        if len(paths) > 10 or sum(path.stat().st_size for path in paths) > 45_000_000:
            raise ValueError('첨부 자료는 최대 10개, 합계 45MB까지 처리합니다.')
        if any(not path.is_file() or not 0 < path.stat().st_size <= MEDIA_LIMIT for path in paths):
            raise ValueError('텔레그램 첨부는 파일당 20MB 이하로 보내 주세요.')
        if request.get('has_attachment') and not paths and kind != 'brief':
            raise ValueError('첨부를 다운로드하지 못했습니다. 파일 크기와 형식을 확인해 주세요.')
        delivery = execute_report(
            kind, subject, [(path.name, path.read_bytes()) for path in paths],
            credentials=lambda: (token, chat), filing=filing,
            provider=os.getenv('WORK_LLM_PROVIDER', 'openai'),
        )
        if delivery['sent'] < delivery['total']:
            send(summary(delivery), token, chat)
        return 0
    except (OSError, ValueError) as error:
        text = str(error) if type(error) is ValueError else '보고서를 생성하지 못했습니다. 파일과 연결 상태를 확인해 주세요.'
        try:
            send(text, token, chat)
        except (OSError, ValueError):
            pass
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
