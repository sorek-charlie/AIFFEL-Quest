import unittest
from pathlib import Path

from app.dart_finance import statement_rows
from app.finance_input import extract_files
from app.telegram_reports import parse_report


class ReportRoutingTests(unittest.TestCase):
    def test_telegram_captions(self):
        cases = {
            '삼성전자': ('bare', '삼성전자'),
            '삼성전자 간략보고서 작성해 달라고': None,
            '삼성전자 간략보고서 작성해 줘': ('brief', '삼성전자'),
            '예시전자 심층보고서': ('deep', '예시전자'),
            '예시전자 종합보고서': ('comprehensive', '예시전자'),
            '예시전자 세무조정계산서': ('adjustment', '예시전자'),
            '회의록 정리': ('meeting', ''),
            '/summary@sample_bot': ('document', ''),
        }
        for message, expected in cases.items():
            with self.subTest(message=message):
                self.assertEqual(parse_report(message, bare=True), expected)

    def test_csv_account_header_with_units(self):
        path = Path(__file__).resolve().parents[1] / 'examples' / 'finance-demo.csv'
        data = extract_files([(path.name, path.read_bytes())])
        self.assertEqual([row['year'] for row in data['rows']], [2023, 2024, 2025])
        self.assertTrue(all(all(row['checks'].values()) for row in data['rows']))

    def test_dart_financial_statements_preserve_unit_and_year(self):
        def table(rows):
            return '<table>' + ''.join(
                '<tr>' + ''.join(f'<td>{value}</td>' for value in row) + '</tr>' for row in rows
            ) + '</table>'
        header = table((('2025.12.31, 2024.12.31, 2023.12.31 (단위 : 백만원)',),))
        html = header + table((
            ('자산', '', '', ''), ('자산총계', 100, 90, 80),
            ('부채총계', 30, 20, 10), ('자본총계', 70, 70, 70),
        )) + header + table((
            ('매출액 (주30)', 10, 9, 8), ('매출원가', 6, 5, 4), ('매출총이익', 4, 4, 4),
            ('판매비와관리비', 3, 3, 3), ('영업이익', 1, 1, 1), ('당기순이익', 1, 1, 1),
        ))
        rows = statement_rows(html, 2025)
        self.assertEqual([row['sales'] for row in rows], [8_000_000, 9_000_000, 10_000_000])
        with self.assertRaisesRegex(ValueError, '금액 단위'):
            statement_rows(html.replace('단위 : 백만원', '금액'), 2025)
