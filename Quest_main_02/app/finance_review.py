"""Short-lived, process-local reuse of normalized finance review results."""
from collections import OrderedDict
from copy import deepcopy
from secrets import token_urlsafe
from threading import Lock
from time import monotonic

_TTL_SECONDS = 600
_MAX_REVIEWS = 8
_reviews = OrderedDict()
_lock = Lock()


def remember(review_id, prepared):
    ticket = token_urlsafe(24)
    with _lock:
        now = monotonic()
        while _reviews and (next(iter(_reviews.values()))[0] <= now or len(_reviews) >= _MAX_REVIEWS):
            _reviews.popitem(last=False)
        _reviews[ticket] = (now + _TTL_SECONDS, review_id, deepcopy(prepared))
    return ticket


def recall(ticket, review_id):
    with _lock:
        item = _reviews.get(ticket) if isinstance(ticket, str) else None
        if item is not None and item[0] <= monotonic():
            del _reviews[ticket]
            item = None
        if item is None or item[1] != review_id:
            raise ValueError('자료 확인 시간이 지났거나 입력이 바뀌었습니다. 자료 확인을 다시 실행하세요.')
        return deepcopy(item[2]), item[1]
