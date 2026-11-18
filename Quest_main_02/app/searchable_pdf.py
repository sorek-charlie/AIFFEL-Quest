"""Add an invisible OCR layer while retaining the original PDF pages."""
from pathlib import Path
import os
import pymupdf

FONT_CANDIDATES = (Path(r'C:\Windows\Fonts\malgun.ttf'), Path(r'C:\Windows\Fonts\arialuni.ttf'))

def searchable_pdf(data, font_path=None, dpi=200, *, title=None):
    font = Path(font_path) if font_path else next((p for p in FONT_CANDIDATES if p.exists()), None)
    if not font or not font.is_file():
        raise ValueError('한국어 글꼴이 없습니다. Windows 맑은 고딕 글꼴을 확인하세요.')
    try:
        document = pymupdf.open(stream=data, filetype='pdf')
    except Exception as exc:
        raise ValueError('PDF 파일을 열 수 없습니다.') from exc
    report = []
    with document:
        if document.needs_pass:
            raise ValueError('암호화된 PDF는 처리할 수 없습니다.')
        if not 0 < len(document) <= 100:
            raise ValueError('PDF는 1~100쪽만 처리합니다.')
        for number, page in enumerate(document, 1):
            native = [pymupdf.Rect(w[:4]) for w in page.get_text('words')]
            try:
                tp = page.get_textpage_ocr(language='kor+eng', dpi=dpi, full=True, tessdata=pymupdf.get_tessdata())
                words = page.get_text('words', textpage=tp)
            except Exception as exc:
                raise ValueError(f'{number}쪽 OCR에 실패했습니다. Tesseract 한글 언어 파일을 확인하세요.') from exc
            fontname = 'searchkorean'
            page.insert_font(fontname=fontname, fontfile=str(font))
            added, skipped = 0, 0
            for x0, y0, x1, y1, text, *_ in words:
                r = pymupdf.Rect(x0, y0, x1, y1)
                if not text.strip() or r.is_empty or r.width < 1 or r.height < 1:
                    continue
                # Existing text is not duplicated; OCR and native text retain their own coordinates.
                if any((r & nr).get_area() / r.get_area() > .5 for nr in native):
                    skipped += 1
                    continue
                size = max(2, min(r.height * .7, 24))
                box = pymupdf.Rect(r.x0, r.y0, r.x1 + max(2, r.width * .15), r.y1 + max(2, r.height * .3))
                left = page.insert_textbox(box, text, fontname=fontname, fontsize=size, render_mode=3, overlay=True)
                if left < 0:
                    skipped += 1
                else:
                    added += 1
            report.append({'page': number, 'ocr_words_added': added, 'skipped': skipped, 'native_words': len(native)})
        if title:
            document.set_metadata({**document.metadata, "title": title})
        return document.tobytes(garbage=3, deflate=True), report
