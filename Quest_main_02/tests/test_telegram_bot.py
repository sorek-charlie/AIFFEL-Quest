import tempfile
import sqlite3
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch
from app.telegram_bot import Bot

class TelegramCommandTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.bot = Bot('fake-token', '42', '7', Path(self.temp.name) / 'state.db')
    def tearDown(self):
        self.temp.cleanup()
    def test_only_matching_user_and_chat_are_accepted(self):
        with patch.object(self.bot, 'send') as send:
            self.bot.handle({'message': {'message_id': 1, 'chat': {'id': 42}, 'from': {'id': 8}, 'text': '/help'}})
            self.bot.handle({'message': {'chat': {'id': 43}, 'from': {'id': 7}, 'text': '/help'}})
            send.assert_not_called()
            self.bot.handle({'message': {'message_id': 2, 'chat': {'id': 42}, 'from': {'id': 7}, 'text': '  /help  '}})
            send.assert_called_once()
        with closing(sqlite3.connect(self.bot.db_path)) as db:
            self.assertEqual(db.execute('SELECT id, text FROM inbound_messages').fetchall(), [('2', '  /help  ')])
    def test_text_command_uses_provider_inference(self):
        with patch.object(self.bot, 'send') as send, patch('app.telegram_bot.analyze', return_value='결과') as ai, patch('app.telegram_bot.publish',return_value={'status':'전송 완료','sent':1,'total':1}):
            self.bot.handle({'message': {'chat': {'id': 42}, 'from': {'id': 7}, 'text': '/meeting 충분한 길이의 회의 원문 내용입니다. 담당자는 업무를 확인합니다.'}})
            ai.assert_called_once()
            self.assertIn('결과', send.call_args.args[0])
    def test_rejects_missing_allowlist(self):
        with self.assertRaises(ValueError):
            Bot('token', '', '')

if __name__ == '__main__':
    unittest.main()
