import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from contextlib import closing
from briefings import job_monitor as mon

class MonitorTests(unittest.TestCase):
    def test_progress_and_logs_are_scoped_and_real(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);monitor=root/'monitor'
            with patch.object(mon,'ROOT',root),patch.object(mon,'MONITOR',monitor):
                self.assertIsNone(mon.state('issue'))
                mon.record('issue','로컬 LLM 요약 중',60)
                self.assertEqual(mon.state('issue')['percent'],60)
                mon.telegram_event('policy','정부정책 PDF','sent')
                self.assertEqual(mon.communication('issue'),[])
                self.assertEqual(mon.communication('policy')[0]['event'],'정부정책 PDF')
                self.assertFalse((monitor/'other.json').exists())
                mon.record('other','ignored',100,'complete')
                self.assertFalse((monitor/'other.json').exists())
    def test_saved_delivery_metadata_without_chat_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);db=root/'output'/'issue'/'daily-delivery.sqlite3';db.parent.mkdir(parents=True)
            with closing(sqlite3.connect(db)) as con,con:
                con.execute('CREATE TABLE deliveries (date TEXT,kind TEXT,status TEXT)')
                con.execute('INSERT INTO deliveries VALUES (?,?,?)',('2026-11-17','pdf','sent'))
            with patch.object(mon,'ROOT',root),patch.object(mon,'MONITOR',root/'monitor'):
                rows=mon.communication('issue')
                self.assertEqual(rows,[{'time':'2026-11-17','event':'PDF','status':'sent'}])

    def test_log_is_time_ordered_fifo_with_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);monitor=root/'monitor';monitor.mkdir()
            rows=[{'time':f'2026-11-18T{h:02d}:{m:02d}:00+09:00','event':f'e{h}{m}','status':'sent'} for h in (9,22) for m in range(20)]
            (monitor/'issue-telegram.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in reversed(rows)),encoding='utf8')
            with patch.object(mon,'ROOT',root),patch.object(mon,'MONITOR',monitor):
                result=mon.communication('issue')
            self.assertLessEqual(len(result),mon.LOG_LIMIT)
            times=[r['time'] for r in result]
            self.assertEqual(times,sorted(times))

if __name__=='__main__':unittest.main()
