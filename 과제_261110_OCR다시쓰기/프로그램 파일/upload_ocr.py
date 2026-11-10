"""Isolated PDF/image uploads, real Tesseract OCR and ruled-table grouping."""
from pathlib import Path
from collections import defaultdict
import csv
import io
import json
import os
import shutil
import subprocess
import threading
import uuid

import cv2
import fitz
import numpy as np
from PIL import Image, ImageOps, ImageDraw

BASE = Path(__file__).resolve().parent / 'uploads'
JOBS = {}
GUARD = threading.Lock()


def engine():
    candidates = [os.environ.get('TESSERACT_CMD'), shutil.which('tesseract'),
                  r'C:\Program Files\Tesseract-OCR\tesseract.exe']
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(candidate)
    raise RuntimeError('Tesseract OCR를 설치하고 PATH 또는 TESSERACT_CMD를 지정하세요.')


def render_page(job, number):
    if not 1 <= number <= job['page_count']:
        raise ValueError('페이지 범위가 잘못되었습니다.')
    target = job['folder'] / f'page-{number}.png'
    if target.exists():
        return target
    if job['is_pdf']:
        with fitz.open(job['input']) as pdf:
            page = pdf[number - 1]
            scale = min(200 / 72, (5_000_000 / max(1, page.rect.width * page.rect.height)) ** .5)
            page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False, colorspace=fitz.csRGB).save(target)
    else:
        with Image.open(job['input']) as image:
            image = ImageOps.exif_transpose(image).convert('RGB')
            image.thumbnail((3000, 3000))
            image.save(target)
    return target


def register(content, filename):
    identifier = uuid.uuid4().hex
    folder = BASE / identifier
    folder.mkdir(parents=True)
    is_pdf = content.lstrip().startswith(b'%PDF-')
    source = folder / ('input.pdf' if is_pdf else 'input.image')
    source.write_bytes(content)
    try:
        if is_pdf:
            with fitz.open(source) as pdf:
                if pdf.needs_pass:
                    raise ValueError('암호가 있는 PDF는 암호를 해제한 후 업로드하세요.')
                pages = len(pdf)
                if not 1 <= pages <= 50:
                    raise ValueError('1~50쪽 PDF를 업로드하세요. 큰 PDF는 나누어 주세요.')
        else:
            with Image.open(source) as image:
                if image.width * image.height > 40_000_000:
                    raise ValueError('이미지는 4천만 화소 이하로 업로드하세요.')
                if image.format not in ['PNG', 'JPEG', 'WEBP', 'BMP', 'TIFF']:
                    raise ValueError('PNG, JPG, WEBP, BMP, TIFF 또는 PDF를 선택하세요.')
                image.verify()
            pages = 1
        job = {'id': identifier, 'name': filename[:200], 'folder': folder, 'input': source,
               'is_pdf': is_pdf, 'page_count': pages, 'status': 'ready', 'completed': 0, 'pages': []}
        render_page(job, 1)
        with GUARD:
            JOBS[identifier] = job
        return public(job)
    except Exception:
        shutil.rmtree(folder)
        raise


def public(job):
    return {k: v for k, v in job.items() if k not in ['folder', 'input']}


def get(identifier):
    with GUARD:
        if identifier not in JOBS:
            raise ValueError('업로드 작업을 찾을 수 없습니다. 다시 업로드하세요.')
        return JOBS[identifier]


def grouped_rows(words):
    rows = []
    for word in sorted(words, key=lambda w: (w['cy'], w['x'])):
        tolerance = max(7, word['h'] * .65)
        if rows and abs(word['cy'] - np.median([q['cy'] for q in rows[-1]])) < tolerance:
            rows[-1].append(word)
        else:
            rows.append([word])
    return [sorted(row, key=lambda w: w['x']) for row in rows]


def structure(image, words):
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    height, width = gray.shape
    binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(40, width // 18), 1)))
    vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(35, height // 25))))
    grid = cv2.dilate(cv2.bitwise_or(horizontal, vertical), np.ones((3, 3), np.uint8))
    contours = cv2.findContours(grid, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
    tables, assigned = [], set()
    for contour in sorted(contours, key=lambda c: cv2.boundingRect(c)[1]):
        x, y, w, h = cv2.boundingRect(contour)
        if w < width * .2 or h < 60:
            continue
        projection = np.sum(vertical[y:y+h, x:x+w] > 0, axis=0)
        hits = np.where(projection > h * .4)[0]
        groups = []
        for value in hits:
            if groups and value - groups[-1][-1] < 8:
                groups[-1].append(int(value))
            else:
                groups.append([int(value)])
        boundaries = [x + int(np.median(group)) for group in groups]
        if len(boundaries) < 3:
            continue
        inside = [word for word in words if x <= word['cx'] <= x+w and y <= word['cy'] <= y+h]
        if len(inside) < 4:
            continue
        if boundaries[0] > x + 15:
            boundaries.insert(0, x)
        if boundaries[-1] < x+w-15:
            boundaries.append(x+w)
        rows = []
        for line in grouped_rows(inside):
            cells = [[] for _ in boundaries[:-1]]
            for word in line:
                col = min(len(cells)-1, max(0, int(np.searchsorted(boundaries, word['cx'], side='right'))-1))
                cells[col].append(word['text'])
                assigned.add(word['id'])
            rows.append([' '.join(cell) for cell in cells])
        tables.append({'id': f'table_{len(tables)+1:03}', 'bbox': [x,y,x+w,y+h],
                       'headers': [f'열 {i+1}' for i in range(len(boundaries)-1)], 'rows': rows})
    text = [{'type': 'text', 'text': ' '.join(w['text'] for w in row)}
            for row in grouped_rows([w for w in words if w['id'] not in assigned])]
    return tables, text


def run(job, language):
    try:
        executable = engine()
        langs = subprocess.run([executable, '--list-langs'], capture_output=True, text=True,
                               encoding='utf-8', errors='replace', timeout=30).stdout.splitlines()
        missing = [lang for lang in language.split('+') if lang not in langs]
        if missing:
            raise RuntimeError('Tesseract 언어 데이터가 없습니다: ' + ', '.join(missing))
        for page in range(1, job['page_count'] + 1):
            path = render_page(job, page)
            # Remove ruling lines for character recognition; retain original for table geometry.
            pixels = np.array(Image.open(path).convert('RGB'))
            gray = cv2.cvtColor(pixels, cv2.COLOR_RGB2GRAY)
            binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
            horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(50, gray.shape[1] // 15), 1)))
            vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(50, gray.shape[0] // 15))))
            mask = cv2.dilate(cv2.bitwise_or(horizontal, vertical), np.ones((3, 3), np.uint8))
            pixels[mask > 0] = 255
            recognition_input = job['folder'] / f'ocr-{page}.png'
            Image.fromarray(pixels).save(recognition_input)
            result = subprocess.run([executable, str(recognition_input), 'stdout', '-l', language, '--psm', '6', 'tsv'],
                                    capture_output=True, timeout=180, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            if result.returncode:
                raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
            words = []
            for record in csv.DictReader(io.StringIO(result.stdout.decode('utf-8-sig')), delimiter='\t'):
                if not record['text'].strip() or float(record['conf']) < 0:
                    continue
                x,y,w,h = [int(record[key]) for key in ['left','top','width','height']]
                words.append({'id': len(words), 'text': record['text'], 'score': float(record['conf']) / 100,
                              'x': x, 'y': y, 'w': w, 'h': h, 'cx': x+w/2, 'cy': y+h/2})
            with Image.open(path) as source:
                image = source.convert('RGB')
            tables, text = structure(np.array(image), words)
            draw = ImageDraw.Draw(image)
            for table in tables:
                draw.rectangle(table['bbox'], outline='#149873', width=3)
            for word in words:
                draw.rectangle((word['x'], word['y'], word['x']+word['w'], word['y']+word['h']), outline='#4588d4', width=1)
            image.save(job['folder'] / f'regions-{page}.png')
            raw_text = '\n'.join(' '.join(w['text'] for w in row) for row in grouped_rows(words))
            data = {'page': page, 'tables': tables, 'text_blocks': text, 'raw_text': raw_text,
                    'words': words, 'engine': 'Tesseract', 'language': language,
                    'table': tables[0] if tables else {'headers': [], 'rows': []},
                    'corrected': {'headers': [], 'rows': []},
                    'scope': '업로드 자료의 실제 OCR 결과. 교정값 없음. 유선 표 휴리스틱이며 병합 셀·무선 표는 검토가 필요합니다.'}
            (job['folder'] / f'result-{page}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            (job['folder'] / f'text-{page}.txt').write_text(raw_text, encoding='utf-8')
            with (job['folder'] / f'tables-{page}.csv').open('w', encoding='utf-8-sig', newline='') as file:
                writer = csv.writer(file)
                for table in tables:
                    writer.writerow([table['id']]);writer.writerow(table['headers']);writer.writerows(table['rows']);writer.writerow([])
            with GUARD:
                job['pages'].append(data)
                job['completed'] = page
        with GUARD:
            job['status'] = 'done'
    except Exception as error:
        with GUARD:
            job['status'] = 'error'
            job['error'] = str(error)


def start(identifier, language):
    if language not in ['eng', 'kor', 'kor+eng']:
        raise ValueError('지원 언어는 eng, kor, kor+eng입니다.')
    job = get(identifier)
    with GUARD:
        if job['status'] == 'running':
            return public(job)
        if sum(j['status'] == 'running' for j in JOBS.values()) >= 1:
            raise ValueError('다른 OCR 작업이 실행 중입니다. 완료 후 다시 실행하세요.')
        job.update(status='running', completed=0, pages=[])
        job.pop('error', None)
    threading.Thread(target=run, args=(job, language), daemon=True).start()
    return public(job)
