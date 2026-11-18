import json
import sqlite3
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
from briefings import daily_news as news
from app.output_delivery import publish


class DailyNewsTests(unittest.TestCase):
    def test_reports_include_all_categories_source_and_local_model(self):
        def fake_fetch(query,now):
            return [{'title':'확인된 제목','source':'example.org','url':'https://example.org/article','published':'2026-11-17T08:00+09:00'}]
        with patch.object(news,'summarize',return_value='제목 기반 검토'):
            text=news.create_report(datetime(2026,11,17,9),fake_fetch,lambda a,b:'제목 기반 검토')
        message=news.news_message(text,'수시')
        self.assertTrue(message.startswith('[Daily News · 수시] 2026-11-17 09:00 기준'))
        self.assertIn('제목 기반 검토',message)
        self.assertIn('■ AI\n확인된 제목\nhttps://example.org/article',message)
        self.assertEqual(message.count('https://example.org/article'),1)
        self.assertLessEqual(len(message.encode('utf-16-le'))//2,news.LIMIT)
        self.assertIn('제목 기반 검토',text)
        self.assertIn('https://example.org/article',text)
        for category in news.QUERIES:self.assertIn('## '+category,text)

    def test_duplicate_and_ambiguous_delivery(self):
        db=sqlite3.connect(':memory:'); calls=[]
        self.assertTrue(news.deliver(db,'2026-11-17','file',lambda:calls.append('sent')))
        self.assertFalse(news.deliver(db,'2026-11-17','file',lambda:calls.append('again')))
        self.assertEqual(calls,['sent'])
        with self.assertRaises(RuntimeError):news.deliver(db,'2026-11-17','notice',lambda:(_ for _ in ()).throw(RuntimeError()))
        with self.assertRaises(ValueError):news.deliver(db,'2026-11-17','notice',lambda:None)

    def test_output_is_saved_when_telegram_is_unavailable(self):
        with tempfile.TemporaryDirectory() as folder:
            def no_credentials():raise ValueError('unavailable')
            result=publish('meeting',{'meeting.md':b'example'},root=folder,credentials=no_credentials)
            self.assertTrue(result['saved']);self.assertEqual(result['sent'],0)
            self.assertEqual((Path(result['folder'])/'meeting.md').read_bytes(),b'example')
            manifest=json.loads((Path(result['folder'])/'delivery.json').read_text('utf8'))
            self.assertEqual(manifest['files'][0]['telegram'],'not_attempted')

    def test_message_without_articles_or_memo(self):
        report='# Daily News\n작성 2026-11-17 09:00 KST\n수집 실패: AI\n\n## AI\n수집된 기사가 없습니다.\n'
        message=news.news_message(report)
        self.assertTrue(message.startswith('[Daily News] 2026-11-17 09:00 기준'))
        self.assertIn('링크를 확인할 수 있는 기사가 없습니다.',message)
        self.assertNotIn('로컬 AI 메모',message)

    def test_message_stays_within_telegram_limit(self):
        def long_fetch(query,now):
            return [{'title':'긴 제목 '*30+str(i),'source':'example.org','url':'https://example.org/'+'x'*600+str(i)+query.replace(' ','-'),'published':'2026-11-17T08:00+09:00'} for i in range(5)]
        text=news.create_report(datetime(2026,11,17,9),long_fetch,lambda a,b:'메모 한 줄')
        message=news.news_message(text)
        self.assertLessEqual(len(message.encode('utf-16-le'))//2,news.LIMIT)
        self.assertIn('메모 한 줄',message)
        self.assertIn('■ AI',message)


if __name__=='__main__':unittest.main()
