import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from app.ingest import extract

class IngestTests(unittest.TestCase):
    def test_utf8_text_and_invalid_format(self):
        with tempfile.TemporaryDirectory() as temp:
            text = Path(temp) / 'input.txt'
            text.write_text('회의 안건과 결정 사항', encoding='utf-8')
            self.assertIn('회의 안건', extract(text)['text'])
            bad = Path(temp) / 'input.exe'
            bad.write_text('unsupported')
            with self.assertRaisesRegex(ValueError, '지원하지 않는'):
                extract(bad)

    def test_transcript_length_is_reported(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'long.txt'
            path.write_text('가' * 60001, encoding='utf-8')
            result = extract(path)
            self.assertTrue(result['truncated'])
            self.assertEqual(len(result['text']), 60000)

    def test_video_uses_audio_extraction_then_stt(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'clip.mp4'
            path.write_bytes(b'fake video')
            with patch('app.ingest.command') as command, patch('app.ingest.transcribe', return_value='인식 결과') as transcribe:
                result = extract(path)
            self.assertIn('동영상', result['method'])
            self.assertEqual(result['text'], '인식 결과')
            command.assert_called_once()
            transcribe.assert_called_once()

if __name__ == '__main__':
    unittest.main()
