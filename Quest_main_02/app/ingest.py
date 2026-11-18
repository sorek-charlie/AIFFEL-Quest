"""Local extraction: PDF, text, image, audio and video; no model calls."""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

TEXT = {'.txt', '.md'}
IMAGE = {'.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.webp'}
AUDIO = {'.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac'}
VIDEO = {'.mp4', '.mov', '.mkv', '.webm', '.avi'}
ALLOWED = TEXT | IMAGE | AUDIO | VIDEO | {'.pdf', '.docx'}

def command(program, args, timeout=180):
    exe = shutil.which(program)
    if not exe:
        raise ValueError(f'{program} 실행 파일이 필요합니다. README의 설치 안내를 확인하세요.')
    try:
        run = subprocess.run([exe, *map(str, args)], capture_output=True, timeout=timeout, check=False)
    except subprocess.TimeoutExpired as exc:
        raise ValueError(f'{program} 처리 시간이 초과되었습니다.') from exc
    if run.returncode:
        raise ValueError(f'{program} 처리에 실패했습니다. 파일 형식 또는 설치 상태를 확인하세요.')
    return run.stdout.decode('utf-8', errors='replace').strip()

def ocr(image):
    return command('tesseract', [image, 'stdout', '-l', 'kor+eng', '--psm', '3'])

def transcribe(path, progress=None):
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise ValueError('음성·동영상 처리를 위해 faster-whisper와 로컬 모델 파일이 필요합니다. README를 확인하세요.') from exc
    default_model = Path(__file__).resolve().parents[1] / 'models' / 'whisper-tiny'
    model_name = os.getenv('WHISPER_MODEL_PATH', str(default_model)).strip()
    if not model_name or not Path(model_name).is_dir():
        raise ValueError('WHISPER_MODEL_PATH에 준비된 로컬 음성인식 모델 폴더를 지정하세요.')
    try:
        if progress:
            progress(0, '음성 인식 모델 준비 중')
        model = WhisperModel(model_name, device='cpu', compute_type='int8', local_files_only=True)
        if progress:
            progress(0, '음성 전사 중')
        segments, info = model.transcribe(str(path), vad_filter=True)
        lines = []
        previous = 0
        for segment in segments:
            lines.append(f'[{int(segment.start // 60):02d}:{int(segment.start % 60):02d}] {segment.text.strip()}')
            percent = min(99, int(segment.end / info.duration * 100)) if info.duration else 0
            if progress and percent > previous:
                progress(percent, '음성 전사 중')
                previous = percent
        return '\n'.join(lines)
    except Exception as exc:
        raise ValueError('음성인식에 실패했습니다. 모델 폴더와 오디오 파일을 확인하세요.') from exc

def extract(path, progress=None):
    path = Path(path)
    ext = path.suffix.lower()
    if ext not in ALLOWED:
        raise ValueError('지원하지 않는 파일 형식입니다. README에서 형식을 확인하세요.')
    if ext in TEXT:
        try:
            content = path.read_text(encoding='utf-8-sig')
        except UnicodeDecodeError as exc:
            raise ValueError('텍스트 파일은 UTF-8 인코딩이어야 합니다.') from exc
        method = '텍스트 읽기'
    elif ext == '.docx':
        try:
            from docx import Document
        except ImportError as exc:
            raise ValueError('DOCX 처리를 위해 python-docx가 필요합니다.') from exc
        doc = Document(path)
        parts = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            parts.extend(' | '.join(c.text for c in row.cells) for row in table.rows)
        content, method = '\n'.join(parts), 'DOCX 문단·표 추출'
    elif ext == '.pdf':
        try:
            import pymupdf
        except ImportError as exc:
            raise ValueError('PDF 처리를 위해 pymupdf가 필요합니다.') from exc
        parts = []
        with pymupdf.open(path) as doc, tempfile.TemporaryDirectory() as tmp:
            if len(doc) > 100:
                raise ValueError('PDF는 100쪽 이하만 처리합니다.')
            for n, page in enumerate(doc, 1):
                text = page.get_text().strip()
                if not text:
                    image = Path(tmp) / f'page-{n}.png'
                    page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False).save(str(image))
                    text = ocr(image)
                parts.append(f'[페이지 {n}]\n{text or "(텍스트 인식 없음)"}')
        content, method = '\n\n'.join(parts), 'PDF 텍스트 추출 및 빈 페이지 OCR'
    elif ext in IMAGE:
        content, method = ocr(path), '이미지 OCR'
    else:
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / 'audio.wav'
            if progress:
                progress(0, '오디오 추출 중')
            command('ffmpeg', ['-nostdin', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-y', wav], timeout=600)
            content = transcribe(wav, progress) if progress else transcribe(wav)
        method = '동영상 음성 추출·STT' if ext in VIDEO else '음성 STT'
    if not content.strip():
        raise ValueError('읽을 수 있는 내용이 없습니다. 파일이나 인식 결과를 확인하세요.')
    return {'text': content[:60000], 'method': method, 'truncated': len(content) > 60000}
