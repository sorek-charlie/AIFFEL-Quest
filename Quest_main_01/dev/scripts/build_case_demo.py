"""Edit private, real app captures into a de-identified submission video.

Raw documents/captures stay in ignored private/. Crops exclude identifying
headers; numerical cells are never rewritten. No credentials are recorded.
"""
from pathlib import Path
import asyncio, json, re, shutil, subprocess, sys, textwrap

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'dev/build/video-tools'))
import edge_tts, imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
RAW = ROOT / 'private/demo-v2'
BUILD = ROOT / 'dev/build/case-demo-v2'
OUT = ROOT / 'outputs/main-quest/video'
for p in [BUILD, BUILD/'audio', BUILD/'subs', BUILD/'segments', BUILD/'fonts']:
    p.mkdir(parents=True, exist_ok=True)
shutil.copyfile('C:/Windows/Fonts/malgun.ttf', BUILD/'fonts/malgun.ttf')

def run(args):
    p = subprocess.run([FF, '-hide_banner', '-nostdin', *args], cwd=BUILD,
                       capture_output=True, encoding='utf8', errors='replace')
    if p.returncode:
        raise RuntimeError(p.stderr[-3500:])
    return p.stderr

def duration(path):
    p = subprocess.run([FF, '-hide_banner', '-i', str(path)], capture_output=True,
                       encoding='utf8', errors='replace')
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', p.stderr)
    return int(m[1])*3600 + int(m[2])*60 + float(m[3])

# crop=(width,height,x,y), all bounds exclude company/account identifiers.
SCENES = [
 ('로그인 화면', 8, '01-login.jpg', None,
  '경정청구 자료 검토 도우미입니다. 로그인 화면부터 자료 입력과 실제 계산 결과를 순서대로 살펴보겠습니다.', '실제 앱 화면 캡처 편집 · AI 내레이션 사용'),
 ('회원가입', 10, '02-signup.jpg', None,
  '처음 방문하면 회원가입 버튼으로 가입 양식을 엽니다. 아이디와 비밀번호를 등록하는 화면입니다. 이 장면은 양식 안내입니다.', '가입 양식 안내 · 가입 완료 장면 아님'),
 ('사용자 계정으로 로그인', 8, '01-login.jpg', None,
  '기존 계정으로 로그인한 뒤부터 실제 회사 자료를 사용합니다. 계정과 비밀번호 입력 구간은 공개하지 않습니다.', '사용자 직접 로그인 · 입력 구간 생략'),
 ('기관·서류·연도별 개별 첨부', 14, '03-upload-five.jpg', (1184,610,32,48),
  '같은 원자료를 압축에서 꺼내 한 파일씩 첨부했습니다. 홈택스 신고서는 귀속연도별로 지정합니다. 고용자료와 보험요율도 구분합니다.', '18개 원자료 실제 개별 첨부 · 파일명 식별정보 제거'),
 ('업로드 결과 확인', 14, '04-upload-detail.jpg', (1290,380,420,675),
  '첨부 후에는 파일별 처리 결과를 확인합니다. 신고서 다섯 개년과 고용자료 백십 이력이 반영됐습니다. 참고자료 읽음과 계산 반영은 서로 다릅니다.', '5/5개년 신고서 · 고용 110이력 · 참고자료 상태 구분'),
 ('법인 Q&A 입력', 14, 'qna-full.jpg', (1640,850,244,325),
  '법인 Q&A에는 회사 사실관계와 확인할 내용을 입력합니다. 시연에서는 확인 필요를 선택하고 이월 명세 대조 메모를 남겼습니다. 답변이 세액에 자동 반영되지는 않습니다.', 'Q&A는 확인 필요로 입력 · 실제 회사 사실관계 확정 아님'),
 ('시뮬레이션 실행', 8, '06-simulate.jpg', (1640,840,244,80),
  '답변을 확인한 뒤 시뮬레이션 실행 버튼을 누릅니다. 개별 첨부 결과와 기존 압축파일 업로드의 계산값은 일치했습니다.', '실제 실행 · ZIP 입력 결과와 개별 입력 결과 일치'),
 ('결과·연도별 결과', 20, 'results-full.jpg', (1640,584,244,647),
  '2023년 추가환급 계산분은 170만 8,345원입니다. 2024년은 230만 6,427원에서 추징 계산분 100만 원을 차감합니다. 현재 프로그램의 잠정 계산이며 확정 환급액은 아닙니다.', '2023 +1,708,345원 / 2024 추가 +2,306,427원 · 추징 −1,000,000원'),
 ('카테고리별 결과', 14, 'results-full.jpg', (1640,384,244,1252),
  '세액공제 감면과 기타를 구분합니다. 농특세 차감 후 계산분 총계는 241만 1,818원입니다. 미확인 항목의 금액은 합산하지 않습니다.', '법인세 순계산분 +3,014,772원 · 기타 −602,954원'),
 ('항목 × 연도별 결과', 16, 'results-full.jpg', (1640,900,244,1658),
  '항목과 연도를 교차해 확인합니다. 이월 계속공제 사용 계산분 합계는 401만 4,772원입니다. 자료 필요 표시는 별도 검토 대상입니다. 화면의 영 원이 실제 환급 불가를 뜻하지는 않습니다.', '연노랑 소계 · 확인분만 합산 · 자료 필요는 미확정'),
 ('계산 근거 보기', 18, 'results-full.jpg', (1640,930,244,5106),
  '계산 근거에서는 원 법인세와 최저한세를 비교합니다. 아래 원장은 공제 발생과 사용, 추징을 나눕니다. 발생 공제액 천팔백육십삼만 원 전체가 곧바로 환급되는 구조는 아닙니다.', '발생 공제액 ≠ 당년 환급 반영액 · 원 신고서 우선'),
 ('2차 항목별 분석', 12, '11-analysis-2023.jpg', (1640,850,244,80),
  '2차 분석에서는 2023년 이월공제를 펼쳐 적용 기준과 금액을 확인합니다. 최초 발생연도 규정과 기공제 잔액을 전문가에게 대조 요청합니다.', '2023년 이월공제 사용 · 적용 기준·금액·보완 확인'),
 ('전문가 확인·보완', 10, '12-expert-preparation.jpg', (1640,880,244,80),
  '전문가 확인 화면에 다음 조치를 기록하고 상담준비로 저장했습니다. 아직 전문가 회신이나 세액 확정이 완료된 상태는 아닙니다.', '상담준비로 저장 · 실제 발송·전문가 확인 미완료'),
 ('Closing', 4, None, None,
  '경정청구 검토 도우미였습니다.', 'AI 발표자·내레이션 사용 · 최종 청구 전 전문가 검토'),
]

def ass_clock(t):
    return f'{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}'

def parts(text):
    return [x.strip()+'다.' for x in text.split('다.') if x.strip()]

def write_ass(i, title, seconds, narration, caption, spoken):
    header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Heading,Malgun Gothic,36,&H00FFFFFF,&H00FFFFFF,&H002B1B10,&H002B1B10,-1,0,0,0,100,100,0,0,3,3,0,7,44,44,24,1
Style: Company,Malgun Gothic,28,&H00FFFFFF,&H00FFFFFF,&H002B1B10,&H002B1B10,0,0,0,0,100,100,0,0,3,3,0,9,44,44,28,1
Style: Note,Malgun Gothic,25,&H004A3B28,&H004A3B28,&H00FFFFFF,&H00FFFFFF,0,0,0,0,100,100,0,0,3,2,0,8,44,44,82,1
Style: Caption,Malgun Gothic,34,&H00FFFFFF,&H00FFFFFF,&H002B1B10,&H002B1B10,0,0,0,0,100,100,0,0,3,4,0,2,70,70,30,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    end=ass_clock(seconds)
    events=[f'Dialogue: 1,0:00:00.00,{end},Heading,,0,0,0,,{i:02d}  {title}',
            f'Dialogue: 1,0:00:00.00,{end},Company,,0,0,0,,주식회사0000 · 잠정 검토',
            f'Dialogue: 1,0:00:00.00,{end},Note,,0,0,0,,{caption}']
    chunks=parts(narration); total=sum(map(len,chunks)); t=0
    for s in chunks:
        delta=spoken*len(s)/total
        wrapped=r'\N'.join(textwrap.wrap(s,width=45))
        events.append(f'Dialogue: 2,{ass_clock(t)},{ass_clock(t+delta)},Caption,,0,0,0,,{wrapped}')
        t+=delta
    (BUILD/'subs'/f'{i:02d}.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')

async def main():
    scenes=[]; start=0
    for i,(title,seconds,filename,crop,narration,caption) in enumerate(SCENES,1):
        voice=BUILD/'audio'/f'{i:02d}.mp3'
        if not voice.exists():
            print('Narration',i,flush=True)
            await edge_tts.Communicate(narration,'ko-KR-InJoonNeural').save(str(voice))
        voice_duration=duration(voice); tempo=max(1,voice_duration/(seconds-.25))
        if tempo>1.4: raise RuntimeError(f'Scene {i} narration too long: {voice_duration}')
        write_ass(i,title,seconds,narration,caption,min(seconds,voice_duration/tempo))
        if i == 4:
            progress=BUILD/'upload-progress.mp4'
            if not progress.exists():
                source_inputs=[]; chains=[]
                for j,(name,bounds,seconds_part) in enumerate([
                    ('03-upload-empty.jpg',(1184,610,32,48),4),
                    ('03-upload-five.jpg',(1184,610,32,48),5),
                    ('03-upload-complete.jpg',(1188,878,350,96),5)]):
                    source_inputs += ['-loop','1','-framerate','1','-i',str(RAW/name)]
                    chains.append(f'[{j}:v]crop='+':'.join(map(str,bounds))+',scale=1840:800:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:145:color=0xf0f5fa,setsar=1,fps=25,'+f'trim=duration={seconds_part},setpts=PTS-STARTPTS[v{j}]')
                run(['-y',*source_inputs,'-filter_complex',';'.join(chains)+';[v0][v1][v2]concat=n=3:v=1:a=0[v]',
                     '-map','[v]','-an','-t','14','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p',str(progress)])
            inputs=['-i',str(progress)];filters=[]
        elif filename:
            inputs=['-loop','1','-framerate','1','-i',str(RAW/filename)]
            filters=[]
            if crop:filters.append('crop='+':'.join(map(str,crop)))
            filters += ['scale=1840:800:force_original_aspect_ratio=decrease',
                        'pad=1920:1080:(ow-iw)/2:145:color=0xf0f5fa','setsar=1']
        else:
            inputs=['-i',str(OUT/'dreamina-presenter-720p.mp4')]
            filters=['scale=1920:1080:force_original_aspect_ratio=decrease',
                     'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white','setsar=1']
        filters.append(f'subtitles=subs/{i:02d}.ass:fontsdir=fonts')
        print('Render',i,flush=True)
        target=BUILD/'segments'/f'{i:02d}.mp4'
        if '--resume' not in sys.argv or not target.exists():run(['-y',*inputs,'-i',str(voice),'-vf',','.join(filters),
             '-af',f'atempo={tempo:.5f},loudnorm=I=-16:TP=-1.5:LRA=11,apad',
             '-t',str(seconds),'-r','25','-c:v','libx264','-preset','veryfast','-crf','19',
             '-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','160k',
             '-movflags','+faststart',f'segments/{i:02d}.mp4'])
        scenes.append(dict(id=i,title=title,start=start,seconds=seconds,narration=narration,
                           caption=caption,voice_seconds=voice_duration,tempo=tempo))
        start+=seconds
    (BUILD/'concat.txt').write_text('\n'.join(f"file 'segments/{i:02d}.mp4'" for i in range(1,15)),encoding='utf8')
    final=OUT/'main-quest-case-demo-1080p.mp4'
    run(['-y','-f','concat','-safe','0','-i','concat.txt','-c','copy','-movflags','+faststart',str(final)])
    def stamp(t):
        ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
        return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'
    subtitles=[];counter=1
    for s in scenes:
        chunks=parts(s['narration']);total=sum(map(len,chunks));t=s['start']
        for chunk in chunks:
            span=min(s['seconds'],s['voice_seconds']/s['tempo'])*len(chunk)/total
            subtitles.extend([str(counter),stamp(t)+' --> '+stamp(t+span),chunk,''])
            t+=span;counter+=1
    (OUT/'korean-captions.srt').write_text('\n'.join(subtitles),encoding='utf-8-sig')
    (OUT/'narration-ko.txt').write_text('\n\n'.join(f"{s['id']:02d} {s['title']}\n{s['narration']}" for s in scenes),encoding='utf8')
    (OUT/'video-production.json').write_text(json.dumps(dict(
        version=2,type='실제 개별 첨부·입력·계산 후 화면 캡처 편집; 연속 조작 녹화 아님',
        privacy='회사 주식회사0000 표기; 계정·원자료·개인정보 제외; 수치 변경 없음',
        limitations=['회원가입은 실제 양식 안내이며 가입 완료 촬영 아님','사용자 로그인 입력 구간 비공개',
                     '전문가 과제는 상담준비이며 회신·세액 확정 미완료'],
        output='1920x1080 H.264/AAC',duration=duration(final),voice='ko-KR-InJoonNeural',
        scenes=scenes),ensure_ascii=False,indent=2),encoding='utf8')
    print('CREATED',final,'duration',duration(final),flush=True)

if __name__=='__main__':asyncio.run(main())
