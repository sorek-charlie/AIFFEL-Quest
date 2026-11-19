"""Create Korean briefing PDFs with selectable text and clickable source links."""
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr
from urllib.parse import urlparse
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, KeepTogether
from reportlab.lib.utils import ImageReader

FONT='BriefingMalgun'; BOLD='BriefingMalgunBold'
pdfmetrics.registerFont(TTFont(FONT,r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont(BOLD,r'C:\Windows\Fonts\malgunbd.ttf'))
styles={
    'title':ParagraphStyle('title',fontName=BOLD,fontSize=23,leading=30,textColor=colors.HexColor('#142945'),spaceAfter=14,wordWrap='CJK'),
    'section':ParagraphStyle('section',fontName=BOLD,fontSize=14,leading=20,textColor=colors.HexColor('#0754bd'),spaceBefore=13,spaceAfter=7,keepWithNext=True,wordWrap='CJK'),
    'body':ParagraphStyle('body',fontName=FONT,fontSize=9.5,leading=16,textColor=colors.HexColor('#20334d'),spaceAfter=5,wordWrap='CJK'),
    'meta':ParagraphStyle('meta',fontName=FONT,fontSize=8,leading=13,textColor=colors.HexColor('#63758d'),spaceAfter=5,wordWrap='CJK'),
    'link':ParagraphStyle('link',fontName=FONT,fontSize=8,leading=13,textColor=colors.HexColor('#0754bd'),spaceAfter=8,wordWrap='CJK'),
}


def _trimmed(path):
    """표지 이미지 바깥의 단색 배경 테두리를 잘라 페이지를 더 꽉 채운다."""
    from PIL import Image as PILImage, ImageChops
    with PILImage.open(path) as raw:
        image=raw.convert('RGB')
    background=PILImage.new('RGB',image.size,image.getpixel((0,0)))
    diff=ImageChops.difference(image,background).convert('L').point(lambda v:255 if v>12 else 0)
    box=diff.getbbox()
    if not box:return image
    pad=6
    box=(max(box[0]-pad,0),max(box[1]-pad,0),min(box[2]+pad,image.width),min(box[3]+pad,image.height))
    return image.crop(box)


def create(text, destination, *, title, cover_image=None):
    destination=Path(destination);destination.parent.mkdir(parents=True,exist_ok=True)
    doc=SimpleDocTemplate(str(destination),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=45,bottomMargin=44,title=title,author='업무 작업실')
    story=[]
    cover=_trimmed(cover_image) if cover_image else None
    if cover:
        story.append(PageBreak())  # 1쪽은 표지 이미지를 여백 없이 크게 그린다(footer 콜백에서).
    story += [Paragraph(escape(title),styles['title'])]
    for raw in text.splitlines():
        line=raw.strip()
        if not line:story.append(Spacer(1,4));continue
        if line.startswith('# Daily News') or line.startswith('[주간 정부지원사업]'):continue
        if line.startswith('# '):story.append(Paragraph(escape(line[2:]),styles['section']));continue
        if line.startswith('## '):story.append(Paragraph(escape(line[3:]),styles['section']));continue
        if line.startswith('[') and line.endswith(']'):story.append(Paragraph(escape(line),styles['section']));continue
        if line.startswith(('https://','http://')):
            if urlparse(line).hostname:
                story.append(Paragraph('<link href='+quoteattr(line)+' color="#0754bd">원문 링크 열기</link>',styles['link']))
            continue
        style=styles['meta'] if line.startswith(('작성 ','수집 실패:', '출처별 수집:', '지역 미확인')) else styles['body']
        story.append(Paragraph(escape(line),style))
    def footer(canvas,document):
        canvas.saveState();canvas.setFont(FONT,8);canvas.setFillColor(colors.HexColor('#718198'))
        footer_text='원문과 최신 신청 조건을 확인해 주세요' if '정부정책' in title else 'AI 분석 결과를 원문과 대조해 주세요'
        canvas.drawString(42,24,'업무 작업실 · '+footer_text)
        canvas.drawRightString(A4[0]-42,24,str(document.page));canvas.restoreState()
    def first(canvas,document):
        if cover:
            w,h=cover.size; edge=16; bottom=44
            scale=min((A4[0]-2*edge)/w,(A4[1]-edge-bottom)/h)
            cw,ch=w*scale,h*scale
            canvas.drawImage(ImageReader(cover),(A4[0]-cw)/2,A4[1]-edge-ch,width=cw,height=ch)
        footer(canvas,document)
    doc.build(story,onFirstPage=first,onLaterPages=footer)
    return destination
