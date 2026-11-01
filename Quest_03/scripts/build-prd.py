from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
pdfmetrics.registerFont(TTFont('Korean','C:/Windows/Fonts/malgun.ttf'))
base=ParagraphStyle('body',fontName='Korean',fontSize=9.2,leading=14,wordWrap='CJK',textColor=HexColor('#243348'),spaceAfter=6)
heading=ParagraphStyle('heading',parent=base,fontSize=11,leading=16,textColor=HexColor('#315b74'),spaceBefore=9,spaceAfter=5)
title=ParagraphStyle('title',parent=base,fontSize=25,leading=33,spaceAfter=12)
story=[]
for line in Path('PRD.md').read_text(encoding='utf-8').splitlines():
 if not line.strip(): continue
 if line.startswith('# '): story.append(Paragraph(escape(line[2:]),title))
 elif line.startswith('## '): story.append(Paragraph(escape(line[3:]),heading))
 else: story.append(Paragraph(escape(line),base))
def footer(c,doc):
 c.setStrokeColor(HexColor('#d8e2e9'));c.line(38,37,557,37);c.setFont('Korean',8);c.setFillColor(HexColor('#5f7487'));c.drawString(38,24,'이성진 / 과제 D-4 · 내 Todo 앱과 PRD');c.drawRightString(557,24,str(doc.page))
doc=SimpleDocTemplate('PRD.pdf',pagesize=(595.28,841.89),rightMargin=38,leftMargin=38,topMargin=33,bottomMargin=48)
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print('Built PRD.pdf')
