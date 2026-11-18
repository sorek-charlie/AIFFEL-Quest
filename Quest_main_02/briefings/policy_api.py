"""Fetch a small real API page; do not log credentials or request URLs."""
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

from briefings.windows_secret import load

ENDPOINT = 'https://apis.data.go.kr/1421000/bizinfo/pblancBsnsService'


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_page(key, page=1, size=10, opener=None):
    key = unquote(key.strip())  # Portal's encoded and decoded forms both work with urlencode.
    params = urlencode({'serviceKey': key, 'dataType': 'json', 'pageNo': page, 'numOfRows': size})
    req = Request(ENDPOINT + '?' + params, headers={'Accept': 'application/json'})
    client = opener or build_opener(NoRedirect())
    try:
        with client.open(req, timeout=30) as response:
            body = response.read(2_000_001)
            if len(body) > 2_000_000:
                raise ValueError('응답 크기가 허용 범위를 넘었습니다.')
            return json.loads(body.decode('utf-8-sig'))
    except HTTPError as exc:
        raise ValueError(f'공공데이터 API HTTP 오류 {exc.code}') from None
    except URLError:
        raise ValueError('공공데이터 API에 연결하지 못했습니다.') from None
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ValueError('JSON 응답을 받지 못했습니다. 승인 상태·키·API 명세를 확인하세요.') from None


def main():
    try:
        payload = request_page(load())
        if not isinstance(payload, dict):
            raise ValueError('응답 형식이 올바르지 않습니다.')
        response = payload.get('response', {})
        header = response.get('header', {}) if isinstance(response, dict) else {}
        if header.get('resultCode') not in ('00', '0', 0):
            raise ValueError('API가 정상 처리 상태를 반환하지 않았습니다. 승인·호출 조건을 확인하세요.')
        body = response.get('body', {})
        print('공고 API 정상 응답')
        print('전체 건수:', body.get('totalCount', '확인 필요'))
        print('요청 페이지:', body.get('pageNo', '확인 필요'))
    except (OSError, ValueError) as exc:
        print(f'조회 실패: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
