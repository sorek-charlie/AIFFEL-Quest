from pathlib import Path
import json,re,html
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,KeepTogether
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/SOLAR_WAR_PRD.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Malgun','C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('MalgunBold','C:/Windows/Fonts/malgunbd.ttf'))
pdfmetrics.registerFontFamily('Malgun',normal='Malgun',bold='MalgunBold',italic='Malgun',boldItalic='MalgunBold')
navy=colors.HexColor('#11243b');blue=colors.HexColor('#0b7097');gray=colors.HexColor('#526477')
body=ParagraphStyle('body',fontName='Malgun',fontSize=9,leading=15.5,textColor=navy,spaceAfter=9,wordWrap='CJK')
h1=ParagraphStyle('h1',parent=body,fontName='MalgunBold',fontSize=21,leading=29,spaceBefore=4,spaceAfter=19,keepWithNext=True)
h2=ParagraphStyle('h2',parent=body,fontName='MalgunBold',fontSize=12,leading=19,spaceBefore=12,spaceAfter=9,keepWithNext=True,textColor=blue)
small=ParagraphStyle('small',parent=body,fontSize=7.8,leading=12,spaceAfter=0)
th=ParagraphStyle('th',parent=small,fontName='MalgunBold',textColor=colors.white)
bullet=ParagraphStyle('bullet',parent=body,leftIndent=12,firstLineIndent=-10,spaceAfter=6)

def inline(s):
    s=html.escape(s).replace('→',' &gt; ')
    s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)',r'<a href="\2" color="#0b7097">\1</a>',s)
    s=s.replace('  \n','<br/>').replace('\n',' ')
    return s

def table(md,section):
    rows=[[x.strip() for x in line.strip().strip('|').split('|')] for line in md.strip().splitlines()]
    rows=[r for r in rows if not all(re.fullmatch(r'[:\- ]+',c) for c in r)]
    n=len(rows[0]);width=A4[0]-96
    if section=='5종 무기 시스템': widths=[25,90,174,width-289]
    elif section=='기능 요구사항과 수용 기준': widths=[36,56,130,width-222]
    elif section=='3D 우주와 함선 디자인': widths=[90,255,width-345]
    elif section=='조작과 화면 구성': widths=[88,205,width-293]
    elif section=='사운드 시스템': widths=[110,width-110]
    elif n==3: widths=[90,185,width-275]
    else: widths=[width/n]*n
    data=[[Paragraph(inline(c),th if i==0 else small) for c in r] for i,r in enumerate(rows)]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f1f5f8'),colors.white]),('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#d8e2eb'))]))
    return t

def decorate(c,doc):
    w,h=A4;c.saveState();c.setFillColor(navy);c.rect(0,h-64,w,64,fill=1,stroke=0)
    c.setFillColor(colors.HexColor('#81e6f2'));c.setFont('MalgunBold',14);c.drawString(48,h-30,'SOLAR WAR')
    c.setFillColor(colors.HexColor('#bbd1df'));c.setFont('Malgun',7);c.drawString(48,h-46,'PRODUCT REQUIREMENTS DOCUMENT / 3D SPACE WARFARE')
    c.setFillColor(colors.HexColor('#d4e0eb'));c.setFont('Malgun',8);c.drawRightString(w-48,h-30,'v1.1  |  2026.11.01')
    c.setStrokeColor(colors.HexColor('#d4dfe8'));c.line(48,40,w-48,40);c.setFillColor(gray);c.setFont('Malgun',7)
    c.drawString(48,26,'SOLAR WAR · 3D 우주 전쟁 게임 PRD');c.drawRightString(w-48,26,str(doc.page));c.restoreState()

p=json.loads((ROOT/'tmp/pdfs/prd-source.json').read_text(encoding='utf-8'))
blocks=p['content']['blocks'];story=[];section='';section_index=-1
for block in blocks:
    md=block['markdown'].strip()
    if md.startswith('# '):
        section_index+=1;section=md[2:]
        if section_index in [2,3,4,5,6,7,8,9,10]:story.append(PageBreak())
        story.append(Paragraph(inline(section),h1))
    elif md.startswith('## '):story.append(Paragraph(inline(md[3:]),h2))
    elif md.startswith('|'):
        story.append(table(md,section));story.append(Spacer(1,12))
    elif re.match(r'^(- |\d+\. )',md):
        for line in md.splitlines():
            if line.strip():
                line=re.sub(r'^- ','• ',line)
                story.append(Paragraph(inline(line),bullet))
    else:story.append(Paragraph(inline(md),body))
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=86,bottomMargin=58,title='SOLAR WAR 3D 우주 전쟁 게임 PRD',author='SOLAR WAR',pageCompression=1)
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
r=PdfReader(OUT);text='\n'.join(page.extract_text() or '' for page in r.pages)
assert '광역 EMP' in text and '사운드 시스템' in text and '기능 요구사항' in text and '결정이 필요한' in text
for i,page in enumerate(r.pages):print(f'page {i+1}: {len(page.extract_text() or "")} characters')
print(f'Created {OUT} ({len(r.pages)} pages, {OUT.stat().st_size:,} bytes)')


