"""Evaluate measured workflow duration and a human comparison with the demo."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

LIMIT_SECONDS = 180
QUALITY_LABELS = {'pass': '동일 수준', 'fail': '기준 미달', 'pending': '미검증'}


def assess(body):
    category = body.get('category')
    if category not in ('finance', 'meeting', 'document', 'issue', 'policy'):
        raise ValueError('업무 유형을 선택하세요.')
    quality = body.get('demo_quality') or 'pending'
    if quality not in QUALITY_LABELS:
        raise ValueError('데모 비교 결과를 확인하세요.')
    try:
        before, after = (Decimal(str(body[field])) for field in ('before', 'after'))
        correct, total = (int(body[field]) for field in ('correct', 'total'))
        raw_seconds = body.get('ready_seconds')
        seconds = None if raw_seconds in (None, '') else Decimal(str(raw_seconds))
        if not (0 < before <= 100000 and 0 <= after <= 100000 and 0 <= correct <= total <= 1000000 and total > 0):
            raise ValueError()
        if seconds is not None and not 0 < seconds <= 360000:
            raise ValueError()
    except (InvalidOperation, ValueError, TypeError, KeyError, OverflowError):
        raise ValueError('시간과 정확도 측정값을 확인하세요.') from None

    within_limit = None if seconds is None else seconds <= LIMIT_SECONDS
    if within_limit is False or quality == 'fail':
        verdict = '미달'
    elif within_limit and quality == 'pass':
        verdict = '합격'
    else:
        verdict = '미검증'
    return {
        'category': category, 'baseline_minutes': float(before), 'ai_total_minutes': float(after),
        'time_saving_percent': float(round((before-after)/before*100, 1)),
        'correct': correct, 'total': total, 'accuracy_percent': round(correct/total*100, 1),
        'ready_seconds': None if seconds is None else float(seconds),
        'deadline_seconds': LIMIT_SECONDS, 'within_deadline': within_limit,
        'demo_quality': quality, 'demo_quality_label': QUALITY_LABELS[quality], 'verdict': verdict,
        'notes': str(body.get('notes') or '').strip()[:1000],
        'measured_at': datetime.now(timezone(timedelta(hours=9))).isoformat(timespec='seconds'),
    }
