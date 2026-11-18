"""An explicitly requested one-off policy refresh; does not consume the weekly slot."""
import json
import time
from datetime import datetime
from briefings.job_monitor import telegram_event
from briefings import policy_weekly as weekly
from briefings.local_model import summarize
from briefings.policy_jobs import run as collect
from briefings.policy_live import KST
from scripts.render_policy_report_image import render
from briefings.report_pdf import create
from app.output_delivery import send_document
from app.report_names import dated_title


def run():
    started=time.monotonic(); now=datetime.now(KST)
    outcome=collect(now,force=True)
    if outcome in ('failed','busy','not_due'):raise ValueError('최신 정책 수집을 완료하지 못했습니다.')
    document=json.loads(weekly.SNAPSHOT.read_text('utf8'))
    bdoc=None
    if document.get('source_status',{}).get('정부24 혜택')=='성공':
        bdoc=json.loads(weekly.BENEFITS.read_text('utf8'))
    benefits=bdoc.get('items',[]) if bdoc else None
    text=weekly.render_digest(document,now,benefits)
    ai=summarize('공고 제목만 바탕으로 중소기업 경영자가 확인할 점을 두 문장으로 제시하세요. 금액, 자격, 일정은 추정하지 마세요.',
                 '\n'.join(line for line in text.splitlines() if line and not line.startswith('http')))
    text='[지금 업데이트 · 수동 시험]\n'+text+'\n\n[로컬 AI 검토 메모 · 원문 확인 필요]\n'+ai
    body = weekly.policy_message(document, now)
    out=weekly.IMAGE_DIR/'수동시험';out.mkdir(parents=True,exist_ok=True)
    stamp=now.strftime('%Y%m%d-%H%M%S'); image=out/f'정책_{stamp}.png'; report=out/f'정책_{stamp}.txt';state=out/f'정책_{stamp}.json'
    title=dated_title('정부정책_주간보고',now)
    pdf=out/stamp/(title+'.pdf')
    render(document,bdoc,now,image,preview=False)
    report.write_text(text+'\n',encoding='utf8')
    create(text,pdf,title=title,cover_image=image)
    status={'logged_in_monitor':True,'started':now.isoformat(timespec='seconds'),'collection':outcome,'photo':'not_attempted','message':'not_attempted','pdf':'not_attempted','pdf_file':pdf.relative_to(out).as_posix()}
    def save():state.write_text(json.dumps(status,ensure_ascii=False,indent=2),encoding='utf8')
    save(); token,chat=weekly.load_bot()
    status['message']='unknown';save()
    weekly.send(body,token,chat,links=True)
    telegram_event('policy','정부정책 메시지','sent',text=body)
    status['message']='sent';status['pdf']='unknown';save()
    send_document(pdf.read_bytes(),pdf.name,'정부정책 현재 업데이트 PDF',token,chat)
    telegram_event('policy','정부정책 업데이트 PDF','sent',file=pdf)
    status['pdf']='sent';status['elapsed_seconds']=round(time.monotonic()-started,1);save()
    print('정책 수집·AI·이미지 저장·발송 완료; 초:',status['elapsed_seconds'])
    print('보고서:',str(image));print('본문:',str(report))


if __name__=='__main__':run()
