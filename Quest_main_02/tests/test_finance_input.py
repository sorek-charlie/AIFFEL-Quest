import datetime as dt
import unittest
from app.finance_input import extract_files,parse_year,number

class FinancialInputTests(unittest.TestCase):
    def fixture(self,assets='100',unit='천원'):
        text=f'단위 : {unit}\n계정명,2023-12-31,2024-12-31,2025-12-31,2026-12-31 (예상)\n자산총계,{assets},120,130,999\n부채총계,40,50,60,999\n자본총계,60,70,70,999\n매출액,200,220,240,999\n매출원가,100,110,120,999\n매출총이익,100,110,120,999\n판매비와관리비,70,80,90,999\n영업이익,30,30,30,999\n'
        return text.encode('utf8')
    def test_unit_period_and_reconciliation(self):
        result=extract_files([('statement.csv',self.fixture())])
        self.assertEqual([r['year'] for r in result['rows']],[2023,2024,2025])
        self.assertEqual(result['rows'][0]['assets'],100000)
        self.assertTrue(all(v is True for row in result['rows'] for v in row['checks'].values()))
        self.assertIn('statement.csv',result['sources']['2023']['assets'])
    def test_negative_and_missing_are_distinct(self):
        self.assertEqual(number('(1,200)',1000),-1200000)
        self.assertIsNone(number('-',1000))
        self.assertIsNone(parse_year('2026-06-30',dt.date(2026,11,17)))
        self.assertIsNone(parse_year('2026-12-31 (예상)',dt.date(2026,11,17)))
    def test_conflicting_documents_are_not_merged(self):
        with self.assertRaisesRegex(ValueError,'일치하지 않습니다'):
            extract_files([('a.csv',self.fixture()),('b.csv',self.fixture('101'))])
    def test_unknown_unit_does_not_default_to_won(self):
        with self.assertRaisesRegex(ValueError,'금액 단위'):
            extract_files([('statement.csv',self.fixture().replace('단위 : 천원'.encode(),'단위 미제공'.encode()))])

if __name__=='__main__':unittest.main()
