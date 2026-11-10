"""Separate a ruled table and surrounding text using image lines and saved OCR.

This deterministic extractor targets the supplied single, upright ruled table.
It does not read reviewed_cells.json or silently correct OCR text.
"""
from pathlib import Path
import csv
import html
import json
from statistics import median

import cv2
from PIL import Image, ImageDraw


def line_positions(binary, vertical):
    height, width = binary.shape
    closing = (1, 21) if vertical else (21, 1)
    opening = (1, 150) if vertical else (150, 1)
    mask = cv2.morphologyEx(binary, cv2.MORPH_CLOSE,
                            cv2.getStructuringElement(cv2.MORPH_RECT, closing))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,
                            cv2.getStructuringElement(cv2.MORPH_RECT, opening))
    positions = []
    for contour in cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]:
        x, y, w, h = cv2.boundingRect(contour)
        if (vertical and h >= height * .6) or (not vertical and w >= width * .9):
            positions.append(round(x + w / 2) if vertical else round(y + h / 2))
    groups = []
    for value in sorted(positions):
        if groups and value - groups[-1][-1] < 8:
            groups[-1].append(value)
        else:
            groups.append([value])
    return [round(median(group)) for group in groups]


def main():
    root = Path(__file__).resolve().parent
    source = root / 'input/census-table.png'
    output = root.parent / '참고자료/outputs/layout'
    output.mkdir(parents=True, exist_ok=True)
    # Decode bytes to support Windows paths containing Korean characters.
    import numpy as np
    gray = cv2.imdecode(np.frombuffer(source.read_bytes(), dtype=np.uint8), 0)
    binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)[1]
    columns = line_positions(binary, True)
    horizontal = line_positions(binary, False)
    if len(columns) < 3 or len(horizontal) < 3:
        raise RuntimeError('Cannot identify outer border, header divider and columns; manual review required.')
    left, right = columns[0], columns[-1]
    top, header_bottom, bottom = horizontal[0], horizontal[1], horizontal[-1]
    records = json.loads((root.parent / '참고자료/outputs/ocr/text_coordinates.json').read_text(encoding='utf-8'))
    for item in records:
        points = item['polygon']
        item['cx'] = sum(p[0] for p in points) / len(points)
        item['cy'] = sum(p[1] for p in points) / len(points)
    headers = [[] for _ in columns[:-1]]
    body, text = [], []
    title_cutoff = columns[0] + (columns[1] - columns[0]) * .3
    for item in records:
        inside = left <= item['cx'] <= right and top <= item['cy'] <= bottom
        # A corner title above the first-column header is outside the cell schema.
        title = inside and item['cy'] < header_bottom and item['cx'] < title_cutoff
        if not inside or title:
            text.append({'type': 'title' if title else 'text', 'ocr_id': item['id'],
                         'text': item['text'], 'polygon': item['polygon']})
        elif item['cy'] < header_bottom:
            col = next(i for i in range(len(columns)-1) if columns[i] <= item['cx'] < columns[i+1])
            headers[col].append(item)
        else:
            body.append(item)
    # Row anchors come from first-column labels; numeric cells use nearest anchor.
    anchors = sorted([q for q in body if q['cx'] < columns[1]], key=lambda q: q['cy'])
    groups = []
    for item in anchors:
        if groups and abs(item['cy'] - median(q['cy'] for q in groups[-1])) < 10:
            groups[-1].append(item)
        else:
            groups.append([item])
    centers = [median(q['cy'] for q in group) for group in groups]
    if not centers:
        raise RuntimeError('No row labels detected; manual review required.')
    cells = [[[] for _ in columns[:-1]] for _ in centers]
    for item in body:
        row = min(range(len(centers)), key=lambda i: abs(centers[i] - item['cy']))
        col = next(i for i in range(len(columns)-1) if columns[i] <= item['cx'] < columns[i+1])
        cells[row][col].append(item)

    def content(items):
        return ' '.join(q['text'] for q in sorted(items, key=lambda q: (q['cy'], q['cx'])))

    header_text = [content(items) for items in headers]
    rows = [[content(items) for items in row] for row in cells]
    with (output / 'table_001.csv').open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.writer(handle)
        writer.writerow(header_text)
        writer.writerows(rows)
    table_html = '<table>\n<thead><tr>' + ''.join('<th>'+html.escape(s)+'</th>' for s in header_text) + '</tr></thead>\n<tbody>\n'
    for row in rows:
        table_html += '<tr>' + ''.join('<td>'+html.escape(s)+'</td>' for s in row) + '</tr>\n'
    table_html += '</tbody>\n</table>'
    (output / 'table_001.md').write_text('| ' + ' | '.join(header_text) + ' |\n|' + '|'.join(['---'] * len(header_text)) + '|\n' + '\n'.join('| ' + ' | '.join(row) + ' |' for row in rows) + '\n', encoding='utf-8')
    (output / 'table_001.html').write_text('<!doctype html><meta charset="utf-8">'+table_html, encoding='utf-8')
    (output / 'text.txt').write_text('\n'.join(block['text'] for block in text)+'\n', encoding='utf-8')
    layout = {'method': 'image ruling lines + OCR coordinates; no reviewed-cell input',
              'scope': 'supplied cropped image; not full-page layout recognition',
              'text_blocks': text, 'tables': [{'id': 'table_001', 'bbox': [left, top, right, bottom],
              'column_boundaries': columns, 'header_bottom': header_bottom,
              'headers': header_text, 'row_centers': centers, 'rows': rows,
              'cell_ocr_ids': [[[q['id'] for q in items] for items in row] for row in cells]}],
              'review_required': ['OCR text is unchanged, including misread headers, footnote digits and punctuation.',
                                  'Single ruled-table heuristic; merged cells, borderless and multiple tables are unsupported.']}
    (output / 'layout.json').write_text(json.dumps(layout, ensure_ascii=False, indent=2), encoding='utf-8')
    markdown = '# Separated OCR document\n\n## Text before table\n\n'
    markdown += '\n\n'.join(q['text'] for q in text if q['type'] == 'title')
    markdown += '\n\n## Table (automatic, uncorrected OCR)\n\n' + table_html
    markdown += '\n\n## Text after table\n\n' + '\n\n'.join(q['text'] for q in text if q['type'] != 'title')
    (output / 'document.md').write_text(markdown+'\n', encoding='utf-8')
    image = Image.open(source).convert('RGB')
    draw = ImageDraw.Draw(image)
    draw.rectangle((left, top, right, bottom), outline='green', width=3)
    for x in columns[1:-1]:
        draw.line((x, top, x, bottom), fill='green', width=2)
    for a, b in zip(centers, centers[1:]):
        y = round((a+b)/2)
        draw.line((left, y, right, y), fill='green', width=1)
    draw.line((left, header_bottom, right, header_bottom), fill='green', width=2)
    for block in text:
        xs = [p[0] for p in block['polygon']]
        ys = [p[1] for p in block['polygon']]
        draw.rectangle((min(xs), min(ys), max(xs), max(ys)), outline='blue', width=2)
    image.save(output / 'layout_regions.png')
    print(f'Extracted {len(rows)} rows x {len(columns)-1} columns; {len(text)} separate text blocks.')


if __name__ == '__main__':
    main()
