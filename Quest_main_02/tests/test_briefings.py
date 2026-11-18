import unittest
import io
import json
import tempfile
from pathlib import Path
from briefings.render import render
from briefings.send import deliver

class ReportTests(unittest.TestCase):
    def test_policy_missing_source_is_not_verified(self):
        doc = {'as_of': '2026-11-16', 'items': [{'title': '공고', 'source_checked': True}]}
        result = render('policy', doc)
        self.assertIn('원문: 확인 필요', result)
        self.assertIn('검증: 원문 대조 필요', result)
        self.assertIn('접수 기한: 원문 확인 필요', result)

    def test_issue_rejects_unknown_topic(self):
        with self.assertRaises(ValueError):
            render('issue', {'as_of': '2026-11-17', 'items': [{'title': '제목', 'topic': '스포츠'}]})

    def test_no_silent_truncation(self):
        with self.assertRaisesRegex(ValueError, '3,800'):
            render('policy', {'as_of': '2026-11-16', 'items': [{'title': '긴 제목' * 1000}]})

    def test_fixture_and_failed_sources_are_visible(self):
        doc = {'as_of': '2026-11-17', 'fixture': True, 'items': [], 'source_failures': ['출처 A']}
        result = render('issue', doc)
        self.assertIn('가상 예시', result)
        self.assertIn('출처 A', result)

    def test_duplicate_send_blocked_after_success(self):
        doc = {'as_of': '2026-11-17', 'items': [{'title': '기사', 'topic': 'AI', 'source': '언론', 'url': 'https://example.com/1', 'source_checked': True}]}
        calls = []
        def fake_open(req, timeout):
            calls.append(req)
            return io.BytesIO(json.dumps({'ok': True, 'result': {'message_id': 42}}).encode())
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'delivery.db'
            self.assertEqual(deliver('issue', doc, 'fake-token', 'fake-chat', path, fake_open), '42')
            with self.assertRaisesRegex(ValueError, '이미 발송'):
                deliver('issue', doc, 'fake-token', 'fake-chat', path, fake_open)
        self.assertEqual(len(calls), 1)

    def test_unverified_or_fixture_cannot_send(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'delivery.db'
            with self.assertRaisesRegex(ValueError, '가상 예시'):
                deliver('policy', {'fixture': True, 'as_of': '2026-11-16', 'items': [{'title': '공고'}]}, 'token', 'chat', path)
            self.assertFalse(path.exists())

    def test_ambiguous_timeout_prevents_retry(self):
        doc = {'as_of': '2026-11-17', 'items': [{'title': '기사', 'topic': 'AI', 'source': '언론', 'url': 'https://example.com/1', 'source_checked': True}]}
        def timeout(req, timeout):
            raise TimeoutError('simulated timeout')
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'delivery.db'
            with self.assertRaisesRegex(ValueError, '확인하지 못했습니다'):
                deliver('issue', doc, 'fake-token', 'fake-chat', path, timeout)
            with self.assertRaisesRegex(ValueError, '발송 결과'):
                deliver('issue', doc, 'fake-token', 'fake-chat', path, timeout)

if __name__ == '__main__':
    unittest.main()
