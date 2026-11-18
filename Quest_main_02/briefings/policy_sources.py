"""Validated public API adapters for current K-Startup and Panpandaero listings."""
import json
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode
from urllib.request import Request, build_opener

from briefings.policy_api import NoRedirect

KSTARTUP='https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01'
PAN='https://apis.data.go.kr/B555280/sprtBizInfos1/getSprtBizInfos1'
GOV24='https://api.odcloud.kr/api/gov24/v3/serviceList'


def fetch(url,params,key):
    params=dict(params,serviceKey=unquote(key.strip()))
    req=Request(url+'?'+urlencode(params),headers={'Accept':'application/json'})
    try:
        with build_opener(NoRedirect()).open(req,timeout=35) as response:
            raw=response.read(5_000_001)
        if len(raw)>5_000_000: raise ValueError('응답 크기 초과')
        return json.loads(raw.decode('utf-8-sig'))
    except HTTPError as exc:
        raise ValueError(f'공공 API HTTP 오류 {exc.code}') from None
    except (URLError,UnicodeError,json.JSONDecodeError):
        raise ValueError('공공 API 연결 또는 응답 오류') from None


def date_text(value):
    s=str(value or '').strip()
    if len(s)==8 and s.isdigit(): return f'{s[:4]}-{s[4:6]}-{s[6:]}'
    return ''


def kstartup(key,get=fetch):
    rows=[]; expected=None; seen=set()
    for page in range(1,501):
        data=get(KSTARTUP,{'page':page,'perPage':100,'returnType':'json','cond[rcrt_prgs_yn::EQ]':'Y'},key)
        if not isinstance(data,dict) or not isinstance(data.get('data'),list) or 'matchCount' not in data:
            raise ValueError('K-Startup 응답 형식 확인 필요')
        count=int(data['matchCount'])
        if expected is None: expected=count
        elif count!=expected: raise ValueError('K-Startup 조회 건수 변경')
        batch=data['data']
        if not batch and len(rows)<expected: raise ValueError('K-Startup 페이지 누락')
        signature=tuple(str(x.get('pbanc_sn')) for x in batch)
        if batch and signature in seen: raise ValueError('K-Startup 중복 페이지')
        seen.add(signature);rows.extend(batch)
        if len(rows)>=expected: break
    if expected is None or len(rows)!=expected: raise ValueError('K-Startup 조회 건수 불일치')
    out=[]
    for x in rows:
        start,end=date_text(x.get('pbanc_rcpt_bgng_dt')),date_text(x.get('pbanc_rcpt_end_dt'))
        out.append({'pblancId':'KSTARTUP:'+str(x.get('pbanc_sn') or ''),'pblancNm':x.get('biz_pbanc_nm') or '',
          'pblancUrl':x.get('detl_pg_url') or '', 'jrsdInsttNm':x.get('pbanc_ntrp_nm') or '',
          'pldirSportRealmLclasCodeNm':x.get('supt_biz_clsfc') or '',
          'reqstBeginEndDe':f'{start} ~ {end}' if start and end else '확인 필요',
          'creatPnttm':'', '_receipt_start':start, '_source':'K-Startup', '_region':x.get('supt_regin') or '',
          'trgetNm':x.get('aply_trgt') or '', 'rcrt_prgs_yn':x.get('rcrt_prgs_yn') or ''})
    return out


def panpandaero(key,year,get=fetch):
    rows=[];expected=None;seen=set()
    for page in range(1,101):
        data=get(PAN,{'pageNo':page,'numOfRows':100,'sprtBizYr':year},key)
        if not isinstance(data,dict) or str(data.get('resultCode')) not in ('00','0') or not isinstance(data.get('item'),list):
            raise ValueError('판판대로 응답 형식 확인 필요')
        count=int(data['totalCount'])
        if expected is None: expected=count
        elif count!=expected: raise ValueError('판판대로 조회 건수 변경')
        batch=data['item']
        if not batch and len(rows)<expected: raise ValueError('판판대로 페이지 누락')
        signature=tuple(str(x.get('sprtBizCd')) for x in batch)
        if batch and signature in seen: raise ValueError('판판대로 중복 페이지')
        seen.add(signature);rows.extend(batch)
        if len(rows)>=expected: break
    if expected is None or len(rows)!=expected: raise ValueError('판판대로 조회 건수 불일치')
    out=[]
    for x in rows:
        start,end=date_text(x.get('rcritBgngYmd')),date_text(x.get('rcritEndYmd'))
        out.append({'pblancId':'PAN:'+str(x.get('sprtBizCd') or ''),'pblancNm':x.get('sprtBizNm') or '',
          'pblancUrl':x.get('sprtBizUrl') or '', 'jrsdInsttNm':x.get('operInstNm') or '',
          'pldirSportRealmLclasCodeNm':x.get('sprtBizTyNm') or '',
          'reqstBeginEndDe':f'{start} ~ {end}' if start and end else '확인 필요',
          'creatPnttm':'', '_receipt_start':start, '_source':'판판대로', '_region':x.get('sprtBizCtpvNm') or '',
          'trgetNm':x.get('sprtBizTrgtNm') or '', 'status':x.get('progrsSttusNm') or ''})
    return out


def gov24_benefits(key,get=fetch):
    """Fetch business/facility and small-business candidates, deduplicated by service ID.

    These are service records, not time-limited announcements or eligibility decisions.
    """
    result=[]; ids=set()
    for audience in ('법인','소상공인'):
        rows=[]; expected=None; seen=set()
        for page in range(1,501):
            data=get(GOV24,{'page':page,'perPage':100,'returnType':'JSON','cond[사용자구분::LIKE]':audience},key)
            if not isinstance(data,dict) or not isinstance(data.get('data'),list) or 'matchCount' not in data:
                raise ValueError('정부24 혜택 응답 형식 확인 필요')
            count=int(data['matchCount'])
            if expected is None: expected=count
            elif count!=expected: raise ValueError('정부24 혜택 조회 건수 변경')
            batch=data['data']
            if not batch and len(rows)<expected: raise ValueError('정부24 혜택 페이지 누락')
            signature=tuple(str(x.get('서비스ID')) for x in batch)
            if batch and signature in seen: raise ValueError('정부24 혜택 중복 페이지')
            seen.add(signature);rows.extend(batch)
            if len(rows)>=expected: break
        if expected is None or len(rows)!=expected: raise ValueError('정부24 혜택 조회 건수 불일치')
        for x in rows:
            if audience not in str(x.get('사용자구분') or ''):
                raise ValueError('정부24 사용자구분 필터 응답 불일치')
            service_id=str(x.get('서비스ID') or '').strip()
            if service_id and service_id in ids: continue
            if service_id: ids.add(service_id)
            result.append({'서비스ID':service_id,'서비스명':x.get('서비스명') or '',
                '상세조회URL':x.get('상세조회URL') or '', '소관기관명':x.get('소관기관명') or '',
                '소관기관유형':x.get('소관기관유형') or '', '사용자구분':x.get('사용자구분') or '',
                '서비스분야':x.get('서비스분야') or '', '지원대상':x.get('지원대상') or '',
                '서비스목적요약':x.get('서비스목적요약') or '', '신청기한':x.get('신청기한') or '',
                '등록일시':x.get('등록일시') or '', '수정일시':x.get('수정일시') or ''})
    return result
