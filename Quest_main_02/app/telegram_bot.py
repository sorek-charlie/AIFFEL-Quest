"""Restricted Telegram command bridge. Only configured chat and user can operate it."""
import json
import os
import sqlite3
import tempfile
import time
import uuid
from contextlib import closing
from pathlib import Path
from urllib.request import Request, urlopen
from .ingest import ALLOWED, extract
from .providers import analyze
from .searchable_pdf import searchable_pdf
from .output_delivery import publish, summary
from .telegram_receipts import save_receipt

ROOT = Path(__file__).resolve().parents[1]
MAX_FILE = 20_000_000
HELP = ('사용 가능한 명령\n'
        '회사명 또는 “회사명 간략보고서” — DART 사업보고서로 간략보고서 생성\n'
        '첨부 설명에 “회사명 심층보고서”, “회사명 종합보고서”, “회사명 세무조정계산서” — 해당 보고서 생성\n'
        '/meeting 원문 — 회의록 생성\n'
        '/summary 원문 — 문서 요약\n'
        '파일·사진·음성·영상의 설명에 /meeting 또는 /summary를 입력하면 처리합니다.\n'
        '/finance — 재무분석 안내\n/issue — 일간 이슈 일정\n/policy — 주간 정책 일정\n/status — 연결 상태\n/help — 도움말\n'
        'PDF는 검색용 텍스트를 추가한 파일도 반환합니다. 생성 결과는 원문과 대조하세요.')

class Bot:
    def __init__(self, token, chat_id, user_id, db_path=None):
        if not token or not str(chat_id).lstrip('-').isdigit() or not str(user_id).isdigit():
            raise ValueError('Telegram token, chat ID, 허용 사용자 ID가 모두 필요합니다.')
        self.token, self.chat_id, self.user_id = token, str(chat_id), str(user_id)
        self.db_path = Path(db_path or (ROOT / 'data' / 'telegram-commands.sqlite3'))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.db_path)) as db, db:
            db.execute('CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value INTEGER NOT NULL)')
    def request(self, method, body, timeout=40):
        req = Request(f'https://api.telegram.org/bot{self.token}/{method}', json.dumps(body).encode(), {'Content-Type': 'application/json'})
        with urlopen(req, timeout=timeout) as response:
            obj = json.load(response)
        if not obj.get('ok'):
            raise ValueError('Telegram 요청 실패')
        return obj['result']
    def send(self, text):
        text = str(text)
        for i in range(0, len(text), 3500):
            self.request('sendMessage', {'chat_id': self.chat_id, 'text': text[i:i+3500]})
    def send_pdf(self, data):
        boundary = '----workroom' + uuid.uuid4().hex
        prefix = (f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{self.chat_id}\r\n'
                  f'--{boundary}\r\nContent-Disposition: form-data; name="document"; filename="searchable.pdf"\r\n'
                  'Content-Type: application/pdf\r\n\r\n').encode()
        body = prefix + data + f'\r\n--{boundary}--\r\n'.encode()
        req = Request(f'https://api.telegram.org/bot{self.token}/sendDocument', body, {'Content-Type': f'multipart/form-data; boundary={boundary}'})
        with urlopen(req, timeout=90) as response:
            result = json.load(response)
        if not result.get('ok'):
            raise ValueError('검색 PDF 발송 실패')
    def get_offset(self):
        with closing(sqlite3.connect(self.db_path)) as db:
            row = db.execute("SELECT value FROM state WHERE key='offset'").fetchone()
        return row[0] if row else 0
    def set_offset(self, offset):
        with closing(sqlite3.connect(self.db_path)) as db, db:
            db.execute("INSERT INTO state(key,value) VALUES('offset',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (offset,))
    def download_file(self, file_id, declared_size):
        if declared_size and declared_size > MAX_FILE:
            raise ValueError('Telegram 파일은 20MB 이하만 처리합니다.')
        info = self.request('getFile', {'file_id': file_id})
        if info.get('file_size', 0) > MAX_FILE:
            raise ValueError('Telegram 파일은 20MB 이하만 처리합니다.')
        remote = str(info.get('file_path', ''))
        if not remote or remote.startswith('/') or '..' in remote.split('/'):
            raise ValueError('Telegram 파일 경로를 확인할 수 없습니다.')
        with urlopen(f'https://api.telegram.org/file/bot{self.token}/{remote}', timeout=60) as resp:
            raw = resp.read(MAX_FILE + 1)
        if len(raw) > MAX_FILE:
            raise ValueError('Telegram 파일은 20MB 이하만 처리합니다.')
        return raw
    def handle(self, update):
        message = update.get('message') or {}
        if str(message.get('chat', {}).get('id')) != self.chat_id or str(message.get('from', {}).get('id')) != self.user_id:
            return
        original = str(message.get('text') or message.get('caption') or '')
        save_receipt(self.db_path, message.get('message_id', update.get('update_id')), original, message.get('date'))
        text = original.strip()
        command, _, content = text.partition(' ')
        command = command.split('@', 1)[0].lower()
        if command in ('/start', '/help'):
            return self.send(HELP)
        from .telegram_reports import execute_report, parse_report
        report = parse_report(text)
        if report and (report[0] not in ('meeting', 'document') or not text.startswith('/')):
            kind, subject = report
            item = message.get('document') or message.get('voice') or message.get('audio') or message.get('video')
            if not item and message.get('photo'):
                item = message['photo'][-1]
            files = []
            if item and kind != 'brief':
                default = '.ogg' if message.get('voice') else '.mp4' if message.get('video') else '.mp3' if message.get('audio') else '.jpg' if message.get('photo') else ''
                name = item.get('file_name') or '첨부파일' + default
                files.append((name, self.download_file(item['file_id'], item.get('file_size', 0))))
            delivery = execute_report(kind, subject, files, credentials=lambda:(self.token, self.chat_id),
                                      provider=os.getenv('WORK_LLM_PROVIDER', 'openai'))
            return self.send(summary(delivery))
        if command in ('/status', '/finance', '/policy', '/issue'):
            status = {'/status':'명령 채널 연결됨. LLM과 정기 발송 연결 여부는 별도 확인이 필요합니다.', '/finance':'간략·심층·종합 보고서의 실제 재무 파일 생성은 아직 준비 중입니다.', '/policy':'정책 보고: 매일 08:30 수집, 월요일 09:00 발송으로 설계했습니다. 자동 수집·예약은 아직 연결되지 않았습니다.', '/issue':'이슈 보고: 매일 09:00으로 설계했습니다. 자동 수집·예약은 아직 연결되지 않았습니다.'}
            return self.send(status[command])
        if not text.startswith('/'):
            from .commands import parse, run_command
            if parse(text):
                return self.send(run_command(text)['message'])
            candidate = parse_report(text, bare=True)
            if candidate and candidate[0] == 'bare' and not any(message.get(name) for name in ('document','voice','audio','video','photo')):
                from .dart_finance import annual_filing
                filing = annual_filing(candidate[1])
                if filing:
                    delivery = execute_report('brief', candidate[1], credentials=lambda:(self.token,self.chat_id), filing=filing)
                    return self.send(summary(delivery))
        if command not in ('/meeting', '/summary'):
            return self.send('지원하는 명령을 확인하려면 /help를 입력하세요.')
        from .report_names import source_title
        task = 'meeting' if command == '/meeting' else 'document'
        item = message.get('document') or message.get('voice') or message.get('audio') or message.get('video')
        ext = ''
        if item:
            ext = Path(str(item.get('file_name', ''))).suffix.lower()
            if not ext:
                ext = '.ogg' if 'voice' in message else '.mp4' if 'video' in message else '.mp3' if 'audio' in message else ''
        elif message.get('photo'):
            item = message['photo'][-1]
            ext = '.jpg'
        names = [item.get('file_name') or '첨부파일'+ext] if item else []
        if item:
            if ext not in ALLOWED:
                raise ValueError('지원하지 않는 파일 형식입니다.')
            raw = self.download_file(item['file_id'], item.get('file_size', 0))
            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / ('input' + ext)
                path.write_bytes(raw)
                if ext == '.pdf':
                    title = source_title('원본문서화', names)
                    pdf, _ = searchable_pdf(raw, title=title)
                    delivery = publish('ocr', {title+'.pdf':pdf}, credentials=lambda:(self.token,self.chat_id))
                    if delivery['sent'] != delivery['total']: self.send(summary(delivery))
                result = extract(path)
                content = result['text']
                if result['truncated']:
                    self.send('원문이 60,000자로 잘렸습니다. 전체 자료를 확인하세요.')
        if not content:
            raise ValueError('명령 뒤에 원문을 입력하거나 명령을 설명으로 넣어 파일을 보내세요.')
        result = analyze(task, content, os.getenv('WORK_LLM_PROVIDER','openai'))
        from briefings.report_pdf import create
        title = source_title('회의록정리' if task == 'meeting' else '요약보고서', names)
        with tempfile.TemporaryDirectory() as tmp:
            path = create(result, Path(tmp)/'report.pdf', title=title)
            delivery = publish(task, {title+'.pdf':path.read_bytes()}, credentials=lambda:(self.token,self.chat_id))
        return self.send('AI 분석 결과 — 원문과 대조해 주세요.\n'+summary(delivery)+'\n\n' + result)
    def run(self):
        while True:
            try:
                updates = self.request('getUpdates', {'offset': self.get_offset(), 'timeout': 25, 'allowed_updates': ['message']}, timeout=35)
                for update in updates:
                    self.set_offset(int(update['update_id']) + 1)
                    try:
                        self.handle(update)
                    except Exception as exc:
                        # Only known validation messages are returned; do not leak tokens or URLs.
                        if isinstance(exc, ValueError):
                            try: self.send(str(exc))
                            except Exception: pass
            except Exception:
                time.sleep(5)

def start_if_configured():
    token, chat, user = (os.getenv(x, '') for x in ('TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_USER_ID'))
    if token and chat and user:
        Bot(token, chat, user).run()
