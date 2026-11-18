import io
import json
import unittest
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import patch

from briefings.policy_weekly import due, policy_message, render_digest, send, send_photo


class WeeklyTests(unittest.TestCase):
    def test_schedule_and_digest_are_honest(self):
        self.assertFalse(due(datetime(2026,11,23,8,59)))
        self.assertTrue(due(datetime(2026,11,23,9,0)))
        self.assertTrue(due(datetime(2026,11,24,9,0)))
        d={'collected_at_kst':'2026-11-23T08:30:00+09:00','items':[{'pblancNm':'[서울] 공고','creatPnttm':'2026-11-20 12:00:00','pblancUrl':'https://example.org/1','reqstBeginEndDe':'2026-11-20 ~ 2026-11-30'}]}
        message=render_digest(d,datetime(2026,11,23,9,0))
        self.assertIn('[서울] 공고',message)
        self.assertIn('K-Startup 미연결',message)
        self.assertIn('판판대로 미연결',message)
        self.assertIn('원문 확인',message)

    def test_policy_message_uses_seven_calendar_days_and_only_links(self):
        def notice(day):
            return {'pblancNm':f'[서울] 공고 {day}', 'creatPnttm':f'2026-11-{day} 12:00:00',
                    'pblancUrl':f'https://example.org/{day}'}
        document = {'items': [notice(day) for day in (16, 17, 23, 24)]}
        self.assertEqual(policy_message(document, datetime(2026,11,23,13)),
                         '[서울] 공고 17\nhttps://example.org/17\n\n[서울] 공고 23\nhttps://example.org/23')

    def test_send_only_targets_explicit_chat(self):
        class MockOpener:
            def open(self,req,timeout):
                self.body=json.loads(req.data)
                return io.BytesIO(b'{"ok":true,"result":{"message_id":123}}')
        opener=MockOpener()
        self.assertEqual(send('test','test-token','123',opener),'123')
        self.assertEqual(opener.body['chat_id'],'123')

    def test_weekly_delivery_is_not_duplicated(self):
        from briefings.policy_weekly import run
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            snapshot=root/'input.json'
            snapshot.write_text(json.dumps({'collected_at_kst':'2026-11-23T08:30:00+09:00','items':[]}),encoding='utf8')
            def render_image(doc,bdoc,now,path,preview=False):
                Path(path).write_bytes(b'image-fixture')
            def render_pdf(text,path,**kwargs): Path(path).write_bytes(b'pdf-fixture')
            with patch('briefings.job_monitor.MONITOR',root/'monitor'), patch('briefings.policy_weekly.SNAPSHOT',snapshot), patch('briefings.policy_weekly.PREVIEW',root/'preview.txt'), patch('briefings.policy_weekly.IMAGE_DIR',root/'images'), patch('briefings.policy_weekly.DB',root/'delivery.sqlite3'), patch('briefings.policy_weekly.run_collection',return_value='not_due'), patch('briefings.policy_weekly.load_bot',return_value=('token','123')), patch('briefings.policy_weekly.summarize',return_value='확인이 필요합니다.'), patch('scripts.render_policy_report_image.render',side_effect=render_image), patch('briefings.report_pdf.create',side_effect=render_pdf), patch('app.output_delivery.send_document',return_value='43'), patch('briefings.policy_weekly.send_photo',return_value='41') as photo, patch('briefings.policy_weekly.send',return_value='42') as sender:
                self.assertEqual(run(datetime(2026,11,23,9,0)),'sent')
                self.assertEqual(run(datetime(2026,11,23,9,30)),'already_sent')
                self.assertEqual(sender.call_count,1)
                self.assertEqual(photo.call_count,0)
                self.assertEqual(sender.call_args.args[0], '최근 7일간 조건에 맞는 정책 공고가 없습니다.')
                rows = (root/'monitor'/'policy-telegram.jsonl').read_text('utf8').splitlines()
                self.assertEqual(json.loads(rows[0])['text'], sender.call_args.args[0])
                self.assertTrue((root/'images'/'주간_정부정책_2026-11-23.png').exists())

    def test_photo_upload_contains_png_and_chat(self):
        from PIL import Image
        class MockOpener:
            def open(self,req,timeout):
                self.request=req
                return io.BytesIO(b'{"ok":true,"result":{"message_id":456}}')
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'report.png'
            Image.new('RGB',(200,300),'white').save(path)
            opener=MockOpener()
            self.assertEqual(send_photo(path,'test-token','123',opener),'456')
            self.assertIn(b'name="photo"',opener.request.data)
            self.assertIn(b'\x89PNG\r\n\x1a\n',opener.request.data)
            self.assertIn(b'\r\n123\r\n',opener.request.data)


if __name__=='__main__':unittest.main()
