"""Visual preview from collected public data; this is not a Telegram screenshot."""
import json
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from briefings.policy_live import KST, region_for, deadline_for
from briefings.separate_reports import valid_url
from briefings.policy_benefits import region as benefit_region

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'/'policy'/'정부정책_주간보고_시안.png'
F='C:/Windows/Fonts/malgun.ttf'; FB='C:/Windows/Fonts/malgunbd.ttf'
FONT={name:ImageFont.truetype(path,size) for name,path,size in (
 ('title',FB,33),('headline',FB,24),('number',FB,29),('strong',FB,17),('body',F,15),('small',F,13),('tiny',F,12))}


def wrap(draw,text,font,width):
    lines=[];line=''
    for c in str(text):
        if line and draw.textlength(line+c,font=font)>width:
            lines.append(line);line=c
        else:line+=c
    if line:lines.append(line)
    return lines


def render(document, bdoc, now, destination, *, preview=False):
    today=now.date();start=today-timedelta(days=6)
    raw=document['items'];relevant=[]
    for x in raw:
        if region_for(x) not in ('서울','경기','전국'):continue
        try: registered=datetime.fromisoformat(str(x.get('creatPnttm') or x.get('_receipt_start') or '').replace('Z','+00:00')).date()
        except ValueError:continue
        deadline=deadline_for(x)
        if not(start<=registered<=today) or (deadline and deadline<today) or not valid_url(x.get('pblancUrl')):continue
        relevant.append((deadline,registered,x))
    relevant.sort(key=lambda p:(p[0] or today+timedelta(days=100000),p[2].get('pblancNm','')))
    urgent=sum(1 for deadline,_,_ in relevant if deadline and 0 <= (deadline-today).days <= 7)
    counts=Counter(region_for(x) for _,_,x in relevant)
    bdoc=bdoc or {'items':[]}
    benefits=[]
    if document.get('source_status',{}).get('정부24 혜택')=='성공' and str(bdoc.get('collected_at_kst',''))[:10]==today.isoformat():
        for item in bdoc.get('items',[]):
            if benefit_region(item) not in ('서울 소재 기관','경기 소재 기관','중앙 기관'):continue
            try:updated=datetime.strptime(str(item.get('수정일시') or item.get('등록일시') or '')[:8],'%Y%m%d').date()
            except ValueError:continue
            if start<=updated<=today and valid_url(item.get('상세조회URL')):benefits.append((updated,item))
    benefits.sort(key=lambda pair:pair[0],reverse=True)
    width=960; tmp=Image.new('RGB',(width,100));measure=ImageDraw.Draw(tmp)
    cards=[]
    for deadline,registered,x in relevant[:7]:
        title=wrap(measure,x.get('pblancNm','제목 확인 필요'),FONT['strong'],width-168)
        if len(title)>3: title=title[:3];title[-1]=title[-1].rstrip()+'…'
        cards.append((deadline,registered,x,title,74+max(0,len(title)-1)*26))
    benefit_cards=[]
    for updated,x in benefits[:2]:
        title=wrap(measure,x.get('서비스명','제목 확인 필요'),FONT['strong'],width-168)
        if len(title)>3: title=title[:3];title[-1]=title[-1].rstrip()+'…'
        benefit_cards.append((updated,x,title,75+max(0,len(title)-1)*26))
    height=590+sum(x[-1]+10 for x in cards)+210+sum(x[-1]+10 for x in benefit_cards)+78
    image=Image.new('RGB',(width,height),'#eef4fb');d=ImageDraw.Draw(image)
    d.rounded_rectangle((32,26,width-32,height-26),radius=24,fill='white')
    d.rounded_rectangle((62,56,204,89),radius=16,fill='#e8f0ff')
    d.text((76,63),'업무 작업실  ·  정책',font=FONT['small'],fill='#0046d7')
    d.text((62,108),'정부정책 주간 보고',font=FONT['title'],fill='#14243d')
    d.text((64,157),f'서울 · 경기 · 전국  |  {start:%Y.%m.%d} ~ {today:%Y.%m.%d}',font=FONT['body'],fill='#50637c')
    subtitle = '실제 수집 자료 기반 미리보기 · 텔레그램 실제 발송 전' if preview else '수집 자료 기준 보고서 · 신청 조건과 접수 여부는 원문 확인'
    d.text((64,185),subtitle,font=FONT['small'],fill='#60728a')
    for i,(n,label) in enumerate(((len(relevant),'최근 7일 관련 공고'),(urgent,'7일 이내 마감'),(len(benefits),'최근 수정된 혜택 후보'))):
        x=62+i*278
        d.rounded_rectangle((x,225,x+260,315),radius=15,fill='#f2f7ff')
        d.text((x+18,238),f'{n:,}건',font=FONT['number'],fill='#0046d7')
        d.text((x+18,280),label,font=FONT['small'],fill='#4a5d78')
    d.text((64,344),'출처별 수집',font=FONT['strong'],fill='#1a2b43')
    status=document.get('source_status',{})
    line='  ·  '.join(f"{name} {status.get(name,'미확인')}" for name in ('기업마당','K-Startup','판판대로','정부24 혜택'))
    d.text((64,377),line,font=FONT['body'],fill='#436086')
    d.text((64,405),f"지역: 전국 {counts['전국']}건  ·  서울 {counts['서울']}건  ·  경기 {counts['경기']}건",font=FONT['body'],fill='#436086')
    d.line((62,449,width-62,449),fill='#dce6f3',width=1)
    d.text((64,471),'마감이 가까운 공고',font=FONT['headline'],fill='#14243d')
    d.text((65,509),'최근 등록 또는 접수 시작 공고 중 일부 · 원문 링크는 텍스트 보고서에서 열 수 있어요',font=FONT['small'],fill='#60728a')
    y=548
    for deadline,registered,x,title,h in cards:
        d.rounded_rectangle((62,y,width-62,y+h),radius=12,fill='white',outline='#dce6f3',width=1)
        yy=y+12
        for line in title:d.text((79,yy),line,font=FONT['strong'],fill='#17283e');yy+=25
        day=f"D-{(deadline-today).days}" if deadline else '마감 확인 필요'
        meta=f"{region_for(x)}  ·  {x.get('_source') or '기업마당'}  ·  {x.get('pldirSportRealmLclasCodeNm') or '분야 확인 필요'}  ·  {day}"
        d.text((79,yy+4),meta,font=FONT['small'],fill='#47617f')
        y+=h+10
    d.line((62,y+18,width-62,y+18),fill='#dce6f3',width=1);y+=47
    d.text((64,y),'정부24 공공서비스 혜택 후보',font=FONT['headline'],fill='#14243d');y+=40
    d.text((65,y),'중앙·서울·경기 소관기관 기준 · 실제 지원 지역과 신청 자격 확인 필요',font=FONT['small'],fill='#60728a');y+=38
    for updated,x,title,h in benefit_cards:
        d.rounded_rectangle((62,y,width-62,y+h),radius=12,fill='#f7faff',outline='#dce6f3',width=1)
        yy=y+12
        for line in title:d.text((79,yy),line,font=FONT['strong'],fill='#17283e');yy+=25
        d.text((79,yy+4),f"소관: {x.get('소관기관명') or '확인 필요'}  ·  수정 {updated.isoformat()}",font=FONT['small'],fill='#47617f');y+=h+10
    if not benefit_cards:d.text((65,y),'최근 수정 혜택 없음 또는 확인 필요',font=FONT['body'],fill='#60728a')
    d.text((64,height-76),'지역 미확인 항목은 위 공고 수에서 제외 · 출처 간 유사 공고는 중복될 수 있음',font=FONT['small'],fill='#60728a')
    destination=Path(destination)
    destination.parent.mkdir(parents=True,exist_ok=True)
    image.save(destination,format='PNG',optimize=True)
    return {'path':destination, 'width':width, 'height':height, 'announcements':len(relevant), 'benefits':len(benefits)}


def main():
    from briefings.policy_weekly import SNAPSHOT, BENEFITS
    now=datetime.now(KST)
    document=json.loads(SNAPSHOT.read_text('utf8'))
    bdoc=json.loads(BENEFITS.read_text('utf8')) if BENEFITS.exists() else None
    result=render(document,bdoc,now,OUT,preview=True)
    print(f"이미지 생성: {OUT} / 공고 {result['announcements']}건, 혜택 후보 {result['benefits']}건")


if __name__=='__main__':main()
