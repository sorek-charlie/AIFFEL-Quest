import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

from briefings.separate_reports import make_report


class SeparateReportsTest(unittest.TestCase):
    def test_preserves_distinct_titles_and_missing_links(self):
        def item(title, url, end):
            return {'title': title, 'regionMajor': '서울', 'bizType': '융자', 'detailUrl': url, 'applyEnd': end}
        first = item('같은 공고', 'https://example.com/?id=1', '2026-11-17')
        items = [first, dict(first), item('다른 공고', 'https://example.com/?id=1', '2026-11-16'),
                 item('링크 없음', '', ''), item('링크 없음', '', '')]
        payload = {'new': {'items': [first]}, 'all': {'items': items}}
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.html'
            source.write_text('<script id="briefing-data">' + json.dumps(payload, ensure_ascii=False) + '</script>', encoding='utf-8')
            report, stats = make_report(source, '서울', date(2026, 11, 17))
        self.assertEqual(stats['duplicates'], 1)
        self.assertEqual(stats['unique'], 4)
        self.assertEqual(stats['진행 가능성 확인'], 1)
        self.assertEqual(stats['기한 경과'], 1)
        self.assertEqual(stats['마감일 미확인'], 2)
        self.assertIn('| 주간 | 같은 공고', report)
        self.assertIn('다른 공고', report)


if __name__ == '__main__':
    unittest.main()
