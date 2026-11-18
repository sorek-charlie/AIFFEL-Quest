import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

from briefings.policy_live import collect, deadline_for, region_for, save_reports


def payload(total, items):
    return {'response': {'header': {'resultCode':'00'}, 'body': {'totalCount':total, 'items':{'item':items}}}}


class LivePolicyTests(unittest.TestCase):
    def test_collect_all_pages_deduplicates_ids(self):
        pages = [[{'pblancId':'1'},{'pblancId':'2'}],[{'pblancId':'2'},{'pblancId':'3'}]]
        rows, info = collect('secret', lambda key,page,size:payload(4,pages[page-1]), size=2)
        self.assertEqual(len(rows),3)
        self.assertEqual(info['duplicates'],1)

    def test_incomplete_page_fails_instead_of_publishing(self):
        with self.assertRaises(ValueError):
            collect('secret',lambda key,page,size:payload(3,[{'pblancId':'1'}] if page==1 else []),size=1)

    def test_unknown_region_and_application_dates(self):
        self.assertEqual(region_for({'pblancNm':'[경기] 공고'}),'경기')
        self.assertEqual(region_for({'pblancNm':'공고','hashtags':'전국,금융'}),'전국')
        self.assertEqual(region_for({'pblancNm':'공고','hashtags':'서울,금융'}),'지역 확인 필요')
        self.assertEqual(deadline_for({'reqstBeginEndDe':'2026-11-01 ~ 2026-11-17'}),date(2026,11,17))
        self.assertIsNone(deadline_for({'reqstBeginEndDe':'예산 소진 시까지'}))

    def test_reports_do_not_put_unknown_in_local_lists(self):
        items=[{'pblancNm':'[서울] A'}, {'pblancNm':'[경기] B'}, {'pblancNm':'C','hashtags':'전국'}, {'pblancNm':'모름'}]
        with tempfile.TemporaryDirectory() as directory:
            dest=Path(directory)
            stats=save_reports(items,{'received':4,'total':4,'duplicates':0},dest,datetime(2026,11,17,tzinfo=timezone.utc))
            self.assertIn(r'\[서울\] A',(dest/'02_전국_서울.md').read_text(encoding='utf8'))
            self.assertNotIn(r'\[경기\] B',(dest/'02_전국_서울.md').read_text(encoding='utf8'))
            self.assertNotIn('모름',(dest/'02_전국_서울.md').read_text(encoding='utf8'))
            self.assertEqual(stats['지역 확인 필요'],1)


if __name__ == '__main__':
    unittest.main()
