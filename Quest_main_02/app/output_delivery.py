"""Save generated results locally first, then send to the user's private bot chat."""
import hashlib
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener

from briefings.policy_api import NoRedirect
from .report_names import valid_filename
from briefings.policy_weekly import load_bot

ROOT = Path(__file__).resolve().parents[1] / 'data' / 'artifacts'
ALLOWED = {'finance', 'meeting', 'document', 'policy', 'issue', 'ocr', 'evaluation'}
LABELS = {'finance':'재무분석', 'meeting':'회의록', 'document':'문서요약', 'policy':'정부정책', 'issue':'이슈 브리핑', 'ocr':'검색 PDF', 'evaluation':'효과 검증'}
MAX_SIZE = 45_000_000


def send_document(data, filename, caption, token, chat, opener=None):
    if not data or len(data)>MAX_SIZE:
        raise ValueError('파일 크기를 확인하세요.')
    boundary='----output'+uuid.uuid4().hex
    # Validate Windows and multipart filename restrictions before encoding UTF-8.
    if not valid_filename(filename):
        raise ValueError('파일명을 확인하세요.')
    head=(f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{chat}\r\n'
          f'--{boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'
          f'--{boundary}\r\nContent-Disposition: form-data; name="document"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode('utf-8')
    req=Request('https://api.telegram.org/bot'+token+'/sendDocument',data=head+data+f'\r\n--{boundary}--\r\n'.encode(),headers={'Content-Type':'multipart/form-data; boundary='+boundary})
    try:
        with (opener or build_opener(NoRedirect())).open(req,timeout=40) as response:
            result=json.load(response)
        if result.get('ok') is not True or not result.get('result',{}).get('message_id'):
            raise ValueError('Telegram 전송 결과를 확인하지 못했습니다.')
        return str(result['result']['message_id'])
    except (HTTPError,URLError,OSError,json.JSONDecodeError):
        raise ValueError('Telegram 전송 결과를 확인하지 못했습니다.') from None


def publish(category, files, *, demo=False, root=ROOT, sender=send_document, credentials=load_bot, now=None, on_saved=None):
    """Store all files; a failed or ambiguous transfer never removes the local output."""
    if category not in ALLOWED or not files:
        raise ValueError('결과 유형을 확인하세요.')
    for filename, data in files.items():
        if not valid_filename(filename):
            raise ValueError('결과 파일명을 확인하세요.')
        if not isinstance(data,bytes) or not data:
            raise ValueError('결과 파일 크기를 확인하세요.')
    now=now or datetime.now(timezone(timedelta(hours=9)))
    folder=Path(root)/now.strftime('%Y-%m-%d')/category/(now.strftime('%H%M%S')+'-'+uuid.uuid4().hex[:10])
    folder.mkdir(parents=True,exist_ok=False)
    record={'created_at':now.isoformat(timespec='seconds'),'category':category,'demo':bool(demo),'files':[]}
    for filename,data in files.items():
        (folder/filename).write_bytes(data)
        record['files'].append({'name':filename,'size':len(data),'sha256':hashlib.sha256(data).hexdigest(),'telegram':'not_attempted'})
    manifest=folder/'delivery.json'
    def save():
        tmp=manifest.with_suffix('.tmp')
        tmp.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
        os.replace(tmp,manifest)
    save()
    if on_saved is not None:
        on_saved()
    try:
        token,chat=credentials()
    except (OSError,ValueError):
        return {'saved':True,'folder':str(folder),'sent':0,'total':len(files),'status':'연결 설정 확인 필요'}
    sent=0
    for item in record['files']:
        if item['size']>MAX_SIZE:
            item['telegram']='too_large';save()
            continue
        # Commit uncertain state before the request; never auto-retry a possibly sent file.
        item['telegram']='unknown';save()
        caption=('가상 시연 · ' if demo else '업무 결과 · ')+LABELS[category]
        try:
            item['message_id']=sender(files[item['name']],item['name'],caption,token,chat)
            item['telegram']='sent';sent+=1;save()
        except (OSError,ValueError):
            save()
            break
    return {'saved':True,'folder':str(folder),'sent':sent,'total':len(files),
            'status':'전송 완료' if sent==len(files) else '전송 결과 확인 필요'}


def summary(delivery):
    return f"PC 저장 완료 · 텔레그램 {delivery['status']} ({delivery['sent']}/{delivery['total']})"
