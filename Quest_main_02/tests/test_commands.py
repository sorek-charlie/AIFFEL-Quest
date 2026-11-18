import threading
import unittest

from app import commands


class CommandTests(unittest.TestCase):
    def test_parse(self):
        self.assertEqual(commands.parse('지금 이 시각기준으로 이슈브리핑 해줘'), 'issue')
        self.assertEqual(commands.parse('이 시각기준으로 정부정책 정리해 줘'), 'policy')
        self.assertEqual(commands.parse('/issue'), 'issue')
        self.assertIsNone(commands.parse('안녕'))
        self.assertIsNone(commands.parse(''))

    def test_run_command_starts_job_and_blocks_duplicate(self):
        started, release = threading.Event(), threading.Event()

        def job():
            started.set()
            release.wait(5)

        result = commands.run_command('이슈브리핑 해줘', runners={'issue': job, 'policy': job})
        self.assertEqual(result['kind'], 'issue')
        self.assertTrue(started.wait(5))
        with self.assertRaises(ValueError):
            commands.run_command('이슈브리핑 다시', runners={'issue': job, 'policy': job})
        release.set()

    def test_unknown_command(self):
        with self.assertRaises(ValueError):
            commands.run_command('날씨 알려줘', runners={})


if __name__ == '__main__':
    unittest.main()
