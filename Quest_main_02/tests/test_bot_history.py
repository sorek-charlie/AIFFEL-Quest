import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from app.bot_history import read_bot_history

class BotHistoryTests(unittest.TestCase):
    def test_only_authorized_personal_chat_and_final_visible_messages(self):
        with tempfile.TemporaryDirectory() as tmp:
            db=Path(tmp)/'history.sqlite'
            with closing(sqlite3.connect(db)) as c, c:
                c.execute('CREATE TABLE sessions(id TEXT,source TEXT,chat_type TEXT,chat_id TEXT,user_id TEXT)')
                c.execute('CREATE TABLE messages(id INTEGER,session_id TEXT,role TEXT,content TEXT,timestamp REAL,active INTEGER,finish_reason TEXT,tool_calls TEXT,display_kind TEXT)')
                c.executemany('INSERT INTO sessions VALUES(?,?,?,?,?)', [('yes','telegram','dm','123','123'),('other','telegram','dm','456','456'),('group','telegram','group','123','123'),('otheruser','telegram','dm','123','456')])
                c.executemany('INSERT INTO messages VALUES(?,?,?,?,?,?,?,?,?)',[(1,'yes','user','허용 지시',1730000000,1,None,None,None),(2,'yes','assistant','허용 답변',1730000100,1,'stop',None,None),(3,'other','user','다른 방',1730000200,1,None,None,None),(4,'group','user','단체 대화',1730000300,1,None,None,None),(5,'otheruser','user','다른 사용자',1730000400,1,None,None,None),(6,'yes','assistant','내부 기록',1730000500,1,'tool_calls','{}',None),(7,'yes','assistant','숨김 기록',1730000600,1,None,None,'hidden')])
            result=read_bot_history(db,'123')
            self.assertEqual([m['text'] for m in result['messages']],['허용 지시','허용 답변'])
            self.assertEqual(result['status'],'partial')
    def test_missing_database_fails_without_creating_one(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'missing.sqlite'
            with self.assertRaises(ValueError): read_bot_history(path,'123')
            self.assertFalse(path.exists())

if __name__=='__main__': unittest.main()
