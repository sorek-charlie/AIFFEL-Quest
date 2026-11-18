import io
import unittest
import pymupdf
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from app.searchable_pdf import searchable_pdf

class SearchablePdfTests(unittest.TestCase):
    def test_scanned_page_keeps_render_and_gains_searchable_text(self):
        image = Image.new('RGB', (1000, 220), 'white')
        font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 45)
        ImageDraw.Draw(image).text((20, 30), '회의 안건 신규 거래처', font=font, fill='black')
        buf = io.BytesIO()
        image.save(buf, format='PNG')
        original = pymupdf.open()
        page = original.new_page(width=500, height=110)
        page.insert_image(page.rect, stream=buf.getvalue())
        pix = page.get_pixmap(alpha=False).samples
        source = original.tobytes()
        original.close()
        result, info = searchable_pdf(source)
        with pymupdf.open(stream=result, filetype='pdf') as doc:
            self.assertEqual(doc[0].get_pixmap(alpha=False).samples, pix)
            self.assertEqual(tuple(doc[0].rect), (0, 0, 500, 110))
            self.assertGreater(info[0]['ocr_words_added'], 0)
            self.assertTrue(doc[0].get_text().strip())

    def test_bad_input_rejected(self):
        with self.assertRaises(ValueError):
            searchable_pdf(b'not a pdf')

if __name__ == '__main__':
    unittest.main()
