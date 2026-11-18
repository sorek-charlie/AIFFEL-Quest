"""웹 화면의 '텔레그램 명령 내리기' 상자와 텔레그램 봇 문자가 같은 동작을 하도록 하는 공용 명령.

- "지금 이 시각 기준으로 이슈브리핑 해줘" → 지금 시각 기준 Daily News를 로컬 LLM으로 만들고 텔레그램으로 발송
- "지금 이 시각 기준으로 정부정책 정리해 줘" → 정책 수집·로컬 AI 정리 후 텔레그램으로 발송(policy_now)
작업은 백그라운드에서 돌고, 진행 단계는 job-monitor에 기록되어 화면의 Local LLM 작업 현황에 표시된다.
"""
import threading
from datetime import datetime

from briefings.job_monitor import record, telegram_event
from briefings.policy_live import KST

HELP = '명령 예: "지금 이 시각 기준으로 이슈브리핑 해줘" 또는 "지금 이 시각 기준으로 정부정책 정리해 줘"'
LABEL = {'issue': '이슈 브리핑', 'policy': '정부정책 정리'}
_lock = threading.Lock()
_running = set()


def parse(text):
    t = str(text or '').replace(' ', '').lower()
    if not t:
        return None
    if '이슈' in t or '뉴스' in t or 'dailynews' in t or t.startswith('/issue'):
        return 'issue'
    if '정책' in t or '지원사업' in t or t.startswith('/policy'):
        return 'policy'
    return None


def issue_now(now=None):
    """Daily News를 지금 시각 기준으로 새로 만들어 발송한다(정기 발송 기록과 별개)."""
    from app.output_delivery import send_document
    from app.report_names import dated_title
    from briefings import daily_news as dn
    from briefings.report_pdf import create
    now = now or datetime.now(KST)
    stamp = now.strftime('%Y-%m-%d_%H%M')
    dn.OUT.mkdir(parents=True, exist_ok=True)
    text = dn.create_monitored_report(now)
    md = dn.OUT / f'Daily_News_{stamp}_수시.md'
    md.write_text(text, encoding='utf8')
    record('issue', '보고서 PDF 준비', 75)
    title = dated_title('Daily News', now)
    pdf = dn.OUT / '수시' / stamp / (title+'.pdf')
    create(text, pdf, title=title)
    token, chat = dn.load_bot()
    record('issue', '텔레그램 발송', 90)
    send_document(pdf.read_bytes(), pdf.name, f'Daily News 수시 PDF · {now:%Y-%m-%d %H:%M} 기준', token, chat)
    telegram_event('issue', 'Daily News PDF', 'sent', file=pdf)
    dn.send_news(text, token, chat, '수시')
    record('issue', f'보고 완료 · 수시({now:%H:%M} 기준)', 100, 'complete')


def policy_now():
    from briefings import policy_now as pn
    record('policy-report', '수시 정책 정리 · 수집·로컬 AI', 10)
    pn.run()
    record('policy-report', '수시 정리 완료', 100, 'complete')


RUNNERS = {'issue': issue_now, 'policy': policy_now}
TASK = {'issue': 'issue', 'policy': 'policy-report'}


def run_command(text, runners=None):
    """명령을 해석해 백그라운드로 실행하고, 바로 보낼 접수 문구를 돌려준다."""
    kind = parse(text)
    if not kind:
        raise ValueError('명령을 이해하지 못했습니다. ' + HELP)
    with _lock:
        if kind in _running:
            raise ValueError(LABEL[kind] + '이(가) 이미 실행 중입니다. 작업 현황에서 진행률을 확인하세요.')
        _running.add(kind)
    job = (runners or RUNNERS)[kind]

    def work():
        try:
            job()
        except Exception as exc:  # 실패는 작업 현황에 남긴다(비밀 정보는 쓰지 않음)
            record(TASK[kind], '작업 실패 · ' + (str(exc)[:60] if isinstance(exc, ValueError) else type(exc).__name__), None, 'failed')
        finally:
            with _lock:
                _running.discard(kind)

    threading.Thread(target=work, daemon=True, name='command-' + kind).start()
    now = datetime.now(KST)
    return {'kind': kind, 'message': f'{LABEL[kind]} 명령 접수 · {now:%Y-%m-%d %H:%M} 기준으로 로컬 LLM 실행을 시작했습니다. 완료되면 텔레그램으로 발송합니다.'}
