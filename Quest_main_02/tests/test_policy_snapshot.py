import json
import tempfile
import unittest
from pathlib import Path
from briefings.html_snapshot import page, scan

class SnapshotTests(unittest.TestCase):
    def test_expired_and_unsafe_links(self):
        doc={'new':{'items':[{'title':'서울 공고','regionMajor':'서울','applyEnd':'2026-11-18','detailUrl':'https://example.org/a'}, {'title':'마감 공고','regionMajor':'경기','applyEnd':'2026-11-15','detailUrl':'https://example.org/b'}, {'title':'<unsafe>','regionMajor':'전국','detailUrl':'javascript:alert(1)'}]}}
        with tempfile.TemporaryDirectory() as d:
            f=Path(d)/'input.html';f.write_text('<script id="briefing-data" type="application/json">'+json.dumps(doc,ensure_ascii=False)+'</script>',encoding='utf8')
            result=scan(f,'2026-11-17')
        self.assertEqual(len(result['items']),2)
        self.assertEqual(result['expired_excluded'],1)
        output=page(result)
        self.assertIn('&lt;unsafe&gt;',output)
        self.assertNotIn('javascript:',output)
        self.assertTrue(all(not x['source_checked'] for x in result['items']))

if __name__=='__main__':unittest.main()
