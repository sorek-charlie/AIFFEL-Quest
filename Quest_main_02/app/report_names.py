"""Names shared by local reports, PDF titles and attachment downloads."""
from datetime import datetime, timedelta, timezone
import re
import unicodedata

KST = timezone(timedelta(hours=9))
FINANCE_LABELS = {
    'brief': '간략보고서', 'deep': '심층보고서', 'comprehensive': '종합보고서',
    'adjustment': '세무조정계산서 분석보고서',
    'reconciliation': '원자료 대조 및 검산', 'normalized-input': '분석 입력',
}
_INVALID = re.compile(r'[<>:"/\\|?*]')


def safe_label(value, fallback='직접입력'):
    value = unicodedata.normalize('NFC', str(value or ''))
    value = ''.join(' ' if unicodedata.category(ch).startswith('C') else ch for ch in value)
    value = _INVALID.sub('_', value)
    return (' '.join(value.split()).strip(' .')[:100].rstrip(' .')) or fallback


def dated_title(label, now=None):
    now = now or datetime.now(KST)
    if now.tzinfo is not None:
        now = now.astimezone(KST)
    return f"{label}_{now:%y%m%d}"


def finance_title(company, kind, now=None):
    return dated_title(f"{safe_label(company, '기업명 미입력')}_{FINANCE_LABELS[kind]}", now)


def source_title(prefix, filenames, now=None):
    names = [safe_label(str(name).replace(chr(92), '/').rsplit('/', 1)[-1].rsplit('.', 1)[0])
             for name in filenames if name]
    name = names[0] if names else '직접입력'
    if len(names) > 1:
        name += f' 외 {len(names)-1}건'
    return dated_title(f'{prefix}_{name}', now)


def valid_filename(name):
    return bool(name and len(name) <= 180 and name == name.strip(' .') and not _INVALID.search(name)
                and not any(unicodedata.category(ch).startswith('C') for ch in name)
                and name.split('.', 1)[0].upper() not in {
                    'CON', 'PRN', 'AUX', 'NUL', *(f'COM{i}' for i in range(1,10)), *(f'LPT{i}' for i in range(1,10))
                })
