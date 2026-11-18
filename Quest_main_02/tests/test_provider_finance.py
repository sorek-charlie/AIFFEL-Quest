import base64
import io
import json
import unittest
import threading
from pathlib import Path
from urllib.request import Request, urlopen
from unittest.mock import patch
from app import providers, server


class ProviderTests(unittest.TestCase):
    def test_openai_and_claude_use_their_own_api(self):
        class Opener:
            def __init__(self,payload):self.payload=payload
            def open(self,req,timeout):self.req=req;return io.BytesIO(json.dumps(self.payload).encode())
        for provider,host,payload in [('openai','api.openai.com',{'output':[{'type':'message','content':[{'type':'output_text','text':'결과'}]}]}),('claude','api.anthropic.com',{'content':[{'type':'text','text':'결과'}]})]:
            opener=Opener(payload)
            with patch('app.providers.credential',return_value='fake-key'):
                self.assertEqual(providers.generate(provider,'instruction','input',opener),'결과')
            self.assertEqual(opener.req.host,host)
            body=json.loads(opener.req.data)
            self.assertEqual(body['model'],'gpt-4.1-mini' if provider=='openai' else 'claude-sonnet-5-5')
            if provider=='openai':self.assertFalse(body['store'])

    def test_finance_progress_and_previews(self):
        import pymupdf
        prepared = {
            'company': '가상 기업', 'unit': '원', 'plan_note': '', 'funding_note': '',
            'request_note': '', 'sources': {}, 'warnings': [], 'input_names': ['input.xlsx'],
            'context': {
                'company_profile': {'founded': {'value': '2018-06-01', 'source': 'credit.pdf · 2쪽'}},
                'vat_periods': [{'start': '2025-01-01', 'end': '2025-06-30', 'total': 3250000,
                                 'tax': 250000, 'source': 'vat.pdf · 1쪽'}],
                'credit_facilities': [{'institution': '예시은행', 'product': '운용리스', 'amount': 1100000,
                                       'maturity': [{'term': '3~6개월', 'amount': 1100000}],
                                       'source': 'credit.xlsx · Sheet1 4행'}],
            },
            'rows': [{'year': 2025, 'sales': 1234567,
                      'checks': {'balance': True, 'gross': None, 'operating': None}}],
        }
        progress = []
        with patch('app.server.credential'), \
             patch('app.server.prepare_general_finance', return_value=(prepared, 'verified')), \
             patch('app.server.generate', return_value='매출 구조를 검토합니다.'), \
             patch('app.server.publish', return_value={'status': '전송 완료', 'sent': 5, 'total': 5}) as publish:
            result = server.generate_finance({'provider': 'claude', 'review_id': 'verified'},
                                             lambda value, stage: progress.append(value))
        self.assertEqual(progress, [10, 25, 40, 55, 80])
        self.assertEqual(set(result['files']), {
            'brief.pdf', 'deep.pdf', 'comprehensive.pdf', 'reconciliation.pdf', 'normalized-input.pdf',
        })
        self.assertEqual(set(publish.call_args.args[1]), set(result['filenames'].values()))
        for name, encoded in result['files'].items():
            with self.subTest(name=name), pymupdf.open(stream=base64.b64decode(encoded), filetype='pdf') as doc:
                self.assertTrue(all(page.get_text().strip() for page in doc))
                self.assertEqual(doc.metadata['title'], result['filenames'][name].removesuffix('.pdf'))
                if name == 'normalized-input.pdf':
                    self.assertIn('1,234,567', doc[0].get_text())
        self.assertEqual(len(result['previews']['deep']), 8)
        comprehensive = result['previews']['comprehensive']
        self.assertEqual(len(comprehensive), 26)
        self.assertIn('회사소개서 목차', comprehensive[1])
        self.assertIn('연간 매출 성장', comprehensive[8])
        self.assertIn('자금 활용안', comprehensive[17])
        self.assertIn('2018-06-01', comprehensive[4])
        self.assertIn('credit.pdf', comprehensive[4])
        self.assertIn('3,250,000', comprehensive[9])
        self.assertIn('vat.pdf', comprehensive[9])
        self.assertIn('여신 및 재무 개선', comprehensive[25])
        self.assertIn('3~6개월', comprehensive[25])
        self.assertIn('credit.xlsx', comprehensive[25])
        self.assertIn('매출 구조를 검토합니다.', '\n'.join(result['previews']['comprehensive']))

    def test_rejected_finance_commentary_still_produces_report(self):
        prepared = {'company': '가상 기업', 'unit': '원', 'plan_note': '', 'funding_note': '',
                    'request_note': '', 'rows': [{'year': 2025, 'sales': 1234567,
                                                'checks': {'balance': True, 'gross': None, 'operating': None}}]}
        with patch.object(server, 'credential'), \
             patch.object(server, 'prepare_general_finance', return_value=(prepared, 'verified')), \
             patch.object(server, 'generate', return_value='이익률이 42%입니다.'), \
             patch.object(server, 'publish', return_value={'saved': True}):
            result = server.generate_finance({'provider': 'openai', 'review_id': 'verified'})
        preview = ''.join(''.join(result['previews']['comprehensive']).split())
        self.assertNotIn('42%', preview)
        self.assertIn('검증에서제외했습니다', preview)
        self.assertIn('AI 검토 의견 제외', result['notice'])
        self.assertIn('comprehensive.pdf', result['files'])


    def test_review_ticket_reuses_validated_input(self):
        from app.finance_review import recall, remember
        original = {'rows': [{'year': 2025}]}
        ticket = remember('review', original)
        retrieved, fingerprint = recall(ticket, 'review')
        self.assertEqual((retrieved, fingerprint), (original, 'review'))
        retrieved['rows'][0]['year'] = 2000
        self.assertEqual(recall(ticket, 'review')[0], original)
        with self.assertRaises(ValueError):
            recall(ticket, 'different')
        with patch('app.finance_review.monotonic', return_value=float('inf')):
            with self.assertRaises(ValueError):
                recall(ticket, 'review')

    def test_effectiveness_requires_time_and_quality(self):
        from app.evaluation import assess
        fields = {'category': 'finance', 'before': '10', 'after': '2', 'correct': '4', 'total': '4'}
        self.assertEqual(assess({**fields, 'ready_seconds': '180', 'demo_quality': 'pass'})['verdict'], '합격')
        self.assertEqual(assess({**fields, 'ready_seconds': '180.01', 'demo_quality': 'pass'})['verdict'], '미달')
        self.assertEqual(assess({**fields, 'ready_seconds': '80', 'demo_quality': 'fail'})['verdict'], '미달')
        self.assertEqual(assess({**fields, 'ready_seconds': '80'})['verdict'], '미검증')
        self.assertEqual(assess({**fields, 'demo_quality': 'pass'})['verdict'], '미검증')

    def test_ready_event_precedes_delivery(self):
        from tempfile import TemporaryDirectory
        from app.output_delivery import publish
        with TemporaryDirectory() as root:
            order = []
            def saved():
                self.assertEqual(len(list(Path(root).rglob('summary.pdf'))), 1)
                order.append('saved')
            def send(*_):
                order.append('sent')
                return 'test-message'
            result = publish('meeting', {'summary.pdf': b'fixture'}, root=root, sender=send,
                             credentials=lambda: ('test-token','test-chat'), on_saved=saved)
        self.assertEqual(order, ['saved', 'sent'])
        self.assertEqual(result['sent'], 1)

    def test_scan_image_is_preserved_in_pdf(self):
        from PIL import Image
        import pymupdf
        raw=io.BytesIO();Image.new('RGB',(80,40),(255,0,0)).save(raw,format='PNG')
        data=server.image_to_pdf(raw.getvalue())
        with pymupdf.open(stream=data,filetype='pdf') as doc:
            self.assertEqual(len(doc),1)
            self.assertEqual((doc[0].rect.width,doc[0].rect.height),(80,40))
            self.assertEqual(tuple(doc[0].get_pixmap().pixel(10,10))[:3],(255,0,0))

    def test_stream_failure_never_emits_completion(self):
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        threading.Thread(target=http.serve_forever,daemon=True).start()
        host=f'127.0.0.1:{http.server_port}'
        try:
            with patch.object(server,'HOSTS',{host}),patch.object(server,'ORIGINS',{'http://'+host}),patch('app.server.credential',side_effect=ValueError('키 설정 필요')):
                req=Request('http://'+host+'/api/finance-stream',data=json.dumps({'provider':'openai','archive':'eA=='}).encode(),headers={'Origin':'http://'+host,'Content-Type':'application/json'})
                with urlopen(req,timeout=10) as response:events=[json.loads(line) for line in response]
            self.assertEqual(events[-1]['type'],'error')
            self.assertFalse(any(item.get('percent')==100 for item in events))
        finally:http.shutdown();http.server_close()

    def test_summary_endpoint_produces_real_pdf(self):
        import pymupdf
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        threading.Thread(target=http.serve_forever,daemon=True).start()
        host=f'127.0.0.1:{http.server_port}'
        try:
            with patch.object(server,'HOSTS',{host}),patch.object(server,'ORIGINS',{'http://'+host}),patch('app.server.analyze',return_value='핵심 내용을 원문과 대조합니다.'),patch('app.server.publish',return_value={'status':'전송 완료','sent':1,'total':1}) as publish:
                payload={'task':'meeting','provider':'claude','text':'회의 내용을 여러 자료에서 모아 정리합니다.','source_names':['회의 원본.png']}
                req=Request('http://'+host+'/api/analyze',data=json.dumps(payload).encode(),headers={'Origin':'http://'+host,'Content-Type':'application/json'})
                with urlopen(req,timeout=10) as response:result=json.load(response)
            with pymupdf.open(stream=base64.b64decode(result['pdf']),filetype='pdf') as doc:
                self.assertIn('핵심 내용',doc[0].get_text())
            self.assertRegex(result['filename'], r'^회의록정리_회의 원본_\d{6}\.pdf$')
            self.assertIn(result['filename'],publish.call_args.args[1])
            with pymupdf.open(stream=base64.b64decode(result['pdf']),filetype='pdf') as doc:
                self.assertEqual(doc.metadata['title'], result['filename'].removesuffix('.pdf'))
                self.assertIn(result['filename'].removesuffix('.pdf'), doc[0].get_text())
        finally:http.shutdown();http.server_close()


if __name__=='__main__':unittest.main()
