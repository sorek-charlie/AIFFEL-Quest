"""Adapter installed alongside the existing private Hermes gateway plugin."""
import asyncio
import json
import os
from pathlib import Path
import re
import subprocess
from sqlite3 import Error as DatabaseError

from .workroom_receipts import save_receipt

TASKS = set()
REPORT = re.compile(r'간략\s*보고서|심층\s*(?:보고서|분석)|종합\s*보고서|세무\s*조정\s*계산서|회의록\s*정리|요약\s*보고서|문서\s*요약|^/(?:brief|deep|comprehensive|adjustment|meeting|summary)\b')
BARE = re.compile(r'[A-Za-z가-힣0-9㈜().&+-]{2,24}')


def private_chat(home):
    config = {}
    for line in (home / '.env').read_text('utf-8-sig').splitlines():
        key, equals, value = line.partition('=')
        if equals and key.strip() in ('TELEGRAM_HOME_CHANNEL', 'TELEGRAM_ALLOWED_USERS'):
            config[key.strip()] = value.strip().strip('"\'')
    chat = config.get('TELEGRAM_HOME_CHANNEL', '')
    allowed = config.get('TELEGRAM_ALLOWED_USERS', '').replace(';', ',').split(',')
    return chat if chat.isdecimal() and chat in {item.strip() for item in allowed} else None


async def dispatch(event, root, home):
    source = event.source
    if getattr(source.platform, 'value', '') != 'telegram' or source.chat_type != 'dm':
        return None
    owner = private_chat(home)
    if not owner or str(source.user_id) != owner or str(source.chat_id) != owner:
        return None
    raw = getattr(event, 'raw_message', None)
    message = getattr(raw, 'effective_message', None) or raw
    caption = getattr(message, 'caption', None)
    original = str(caption or getattr(message, 'text', None) or event.text or '')
    stamp = getattr(message, 'date', None)
    try:
        await asyncio.to_thread(save_receipt, root / 'data' / 'telegram-commands.sqlite3',
                                event.message_id, original, stamp.timestamp() if stamp else None)
    except (OSError, DatabaseError):
        pass
    text = original.strip()
    media = list(event.media_urls or ())
    attached = bool(media or any(getattr(message, name, None) for name in ('document', 'audio', 'voice', 'video', 'photo')))
    explicit = bool(REPORT.search(text))
    if not explicit and (attached or not BARE.fullmatch(text)):
        return None
    files = []
    # These are paths supplied by the authenticated gateway adapter, never by message text.
    caches = [(home / name).resolve() for name in ('cache', 'image_cache', 'audio_cache', 'video_cache', 'document_cache')]
    for entry in media:
        path = Path(entry)
        if path.is_absolute():
            path = path.resolve()
            if path.is_file() and any(path.is_relative_to(cache) for cache in caches):
                files.append(str(path))
    request = dict(text=text, files=files, has_attachment=attached, chat=owner, user=owner,
                   message_id=event.message_id)
    python = root / '.venv' / 'Scripts' / 'python.exe'
    if not python.is_file():
        return None

    async def run():
        process = await asyncio.create_subprocess_exec(
            str(python), '-m', 'app.telegram_gateway', cwd=str(root),
            env={**os.environ, 'WORKROOM_HERMES_HOME': str(home)},
            stdin=asyncio.subprocess.PIPE, stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0),
        )
        await process.communicate(json.dumps(request, ensure_ascii=True).encode('ascii'))
        return process.returncode

    if explicit:
        # Ignore mentions in ordinary conversation that do not form a report command.
        normalized = ''.join(text.split())
        if not (normalized.startswith('/') or re.search(r'(?:보고서|심층분석|계산서|회의록정리|문서요약)(?:[를을])?(?:(?:작성|생성|분석|정리)(?:해(?:줘요?|주세요)|부탁해요?)?)?[.!?]*$', normalized)):
            return None
        task = asyncio.create_task(run())
        TASKS.add(task)
        task.add_done_callback(TASKS.discard)
        return {'action': 'skip', 'reason': 'workroom report dispatched'}
    code = await run()
    return {'action': 'skip', 'reason': 'workroom DART report handled'} if code in (0, 1) else None
