import unittest
from briefings.policy_sources import gov24_benefits,kstartup,panpandaero


class SourceTests(unittest.TestCase):
    def test_kstartup_uses_filtered_match_count(self):
        calls=[]
        def get(url,params,key):
            calls.append(params)
            return {'totalCount':30000,'matchCount':1,'data':[{'pbanc_sn':7,'biz_pbanc_nm':'A','supt_regin':'서울','pbanc_rcpt_bgng_dt':'20261101','pbanc_rcpt_end_dt':'20261130'}]}
        rows=kstartup('key',get=get)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['_region'],'서울')
        self.assertEqual(calls[0]['cond[rcrt_prgs_yn::EQ]'],'Y')

    def test_pan_reads_year_and_date(self):
        def get(url,params,key):
            self.assertEqual(params['sprtBizYr'],2026)
            return {'resultCode':'00','totalCount':1,'item':[{'sprtBizCd':'3','sprtBizNm':'A','rcritBgngYmd':'20261101','rcritEndYmd':'20261130'}]}
        rows=panpandaero('key',2026,get=get)
        self.assertEqual(rows[0]['reqstBeginEndDe'],'2026-11-01 ~ 2026-11-30')

    def test_gov24_deduplicates_audience_overlap(self):
        def get(url,params,key):
            audience=params['cond[사용자구분::LIKE]']
            return {'matchCount':1,'data':[{'서비스ID':'same','서비스명':'혜택','사용자구분':'법인/시설/단체||소상공인'}]}
        rows=gov24_benefits('key',get=get)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['서비스ID'],'same')


if __name__=='__main__':unittest.main()
