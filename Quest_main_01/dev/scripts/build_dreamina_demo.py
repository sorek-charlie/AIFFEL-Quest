"""Compose a clearly labelled capture-based video; never fake app actions.
Requires the user-authorized Dreamina presenter clip and local media packages.
"""
from pathlib import Path
import argparse,asyncio,json,math,re,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'dev/build/video-tools'))
import edge_tts,imageio_ffmpeg
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
BUILD=ROOT/'dev/build/demo-video';OUT=ROOT/'outputs/main-quest/video'
for p in (BUILD,OUT,BUILD/'assets',BUILD/'audio',BUILD/'subs',BUILD/'segments',BUILD/'fonts'):p.mkdir(parents=True,exist_ok=True)
shutil.copyfile('C:/Windows/Fonts/malgun.ttf',BUILD/'fonts/malgun.ttf')

def run(args):
 result=subprocess.run([FFMPEG,'-hide_banner','-nostdin',*args],cwd=BUILD,capture_output=True,text=True,encoding='utf8',errors='replace')
 if result.returncode:raise RuntimeError(result.stderr[-4500:])
 return result

def duration(path):
 result=subprocess.run([FFMPEG,'-hide_banner','-i',str(path)],capture_output=True,text=True,encoding='utf8',errors='replace')
 m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',result.stderr)
 if not m:raise RuntimeError('Cannot read duration: '+str(path))
 return int(m[1])*3600+int(m[2])*60+float(m[3])

def clock(value):
 h=int(value//3600);m=int(value%3600//60);s=value%60
 return f'{h}:{m:02d}:{s:05.2f}'

def srtclock(value):return clock(value).replace('.',',').rjust(12,'0')

def make_scenes():
 text=(ROOT/'docs/submission/storyboard/DREAMINA_실사영상_편집표.md').read_text('utf8')
 rows=[line.split('|')[1:-1] for line in text.splitlines() if re.match(r'^\| \d\d:\d\d',line)]
 assert len(rows)==10
 sources=['04-login.png','04-login.png','03-signup-prompt.png','04-auto-login.png','01-individual-upload.png','01-individual-upload.png','07-qna-review.png','02-year-results.png','03-upload-report.png','10-reset-logout.png']
 ids=['서비스 소개','ID/PW 로그인·회원가입','방문2~3분 후 가입 안내','가입10초 후 자동 로그인','기관·서류·연도별 첨부','기타 서류 등록','법인 Q&A·검토','5개년 잠정 결과','보고서4·HTML 저장','Reset·로그아웃']
 scenes=[]
 for i,row in enumerate(rows):
  parts=[v.strip() for v in row];times=parts[0].split('–')
  seconds=lambda t:int(t.split(':')[0])*60+int(t.split(':')[1])
  start,end=map(seconds,times);real=i in (0,1,4,5,7,8)
  source=ROOT/('docs/submission/screenshots' if real else 'docs/submission/storyboard/scenes-16x9')/sources[i]
  suffix=f'{i+1:02d}';shutil.copyfile(source,BUILD/'assets'/f'{suffix}.png')
  scenes.append({'id':suffix,'title':ids[i],'start':start,'seconds':end-start,'narration':parts[2],'caption':parts[3],'real':real,'source':str(source.relative_to(ROOT))})
 return scenes

async def speech(scenes):
 for scene in scenes:
  target=BUILD/'audio'/f"{scene['id']}.mp3"
  if not target.exists():
   print('Narrating scene '+scene['id'],flush=True)
   await edge_tts.Communicate(scene['narration'],'ko-KR-InJoonNeural',rate='+0%').save(str(target))
  scene['voice_seconds']=duration(target)
  # Accelerate only if necessary, and only within a natural range.
  scene['tempo']=max(1,scene['voice_seconds']/(scene['seconds']-.6))
  if scene['tempo']>1.4:raise RuntimeError('Narration is too long for scene '+scene['id'])

def subtitles(scene):
 header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Malgun Gothic,34,&H00FFFFFF,&H00FFFFFF,&H00172C45,&H00172C45,0,0,0,0,100,100,0,0,3,3,0,2,80,80,36,1
Style: Heading,Malgun Gothic,36,&H001C3652,&H001C3652,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,1,1,0,7,50,50,20,1
Style: Notice,Malgun Gothic,25,&H00445465,&H00445465,&H00FFFFFF,&H00FFFFFF,0,0,0,0,100,100,0,0,3,1,0,9,30,30,26,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
 end=clock(scene['seconds'])
 events=[f"Dialogue: 0,0:00:00.00,{end},Heading,,0,0,0,,{scene['id']}  {scene['title']}"]
 notice='실제 앱 캡처 · AI 발표자·내레이션' if scene['real'] else 'AI 기능 설명 · 실제 동작 미촬영'
 events.append(f'Dialogue: 0,0:00:00.00,{end},Notice,,0,0,0,,{notice}')
 # Narration captions follow sentence boundaries rather than a long static block.
 parts=[s.strip()+'다.' for s in scene['narration'].split('다.') if s.strip()]
 total=sum(len(s) for s in parts);position=0
 spoken_duration=min(scene['seconds'],scene['voice_seconds']/scene['tempo'])
 for part in parts:
  span=spoken_duration*len(part)/total
  events.append(f'Dialogue: 1,{clock(position)},{clock(min(scene["seconds"],position+span))},Caption,,0,0,0,,{part}')
  position+=span
 path=BUILD/'subs'/f"{scene['id']}.ass";path.write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')

def render(scenes):
 presenter=OUT/'dreamina-presenter-720p.mp4'
 assert presenter.exists(),'Download the user-authorized presenter clip first'
 shutil.copyfile(presenter,BUILD/'assets/presenter.mp4')
 for scene in scenes:
  name=scene['id'];target=BUILD/'segments'/f'{name}.mp4'
  subtitles(scene)
  # Only the intro uses the 5s moving presenter, then freezes to the verified login capture.
  if name=='01':
   run(['-y','-i','assets/presenter.mp4','-loop','1','-i',f'assets/{name}.png','-filter_complex',
    '[0:v]scale=1920:960:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:90:white,setsar=1,fps=25,trim=duration=5,setpts=PTS-STARTPTS[a];'
    '[1:v]scale=1920:900:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:100:white,setsar=1,fps=25,trim=duration=10,setpts=PTS-STARTPTS[b];'
    '[a][b]concat=n=2:v=1:a=0[v]','-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','assets/intro-base.mp4'])
   inputs=['-i','assets/intro-base.mp4']
   vf='subtitles=subs/'+name+'.ass:fontsdir=fonts'
  else:
   inputs=['-loop','1','-i',f'assets/{name}.png']
   vf='scale=1920:900:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:100:white,setsar=1,subtitles=subs/'+name+'.ass:fontsdir=fonts'
  print('Rendering scene '+name,flush=True)
  run(['-y',*inputs,'-i',f'audio/{name}.mp3','-vf',vf,'-af',f'atempo={scene["tempo"]:.5f},loudnorm=I=-16:TP=-1.5:LRA=11,apad',
   '-t',str(scene['seconds']),'-r','25','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','160k','-movflags','+faststart',str(target)])
 (BUILD/'concat.txt').write_text('\n'.join("file 'segments/"+s['id']+".mp4'" for s in scenes),encoding='utf8')
 final=OUT/'main-quest-capture-introduction-1080p.mp4'
 run(['-y','-f','concat','-safe','0','-i','concat.txt','-c','copy','-movflags','+faststart',str(final)])
 srt=[];index=1
 def stamp(t):
  milliseconds=round(t*1000);hours,milliseconds=divmod(milliseconds,3600000);minutes,milliseconds=divmod(milliseconds,60000);seconds,milliseconds=divmod(milliseconds,1000)
  return f'{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}'
 for scene in scenes:
  parts=[s.strip()+'다.' for s in scene['narration'].split('다.') if s.strip()];total=sum(len(s) for s in parts);position=scene['start']
  for part in parts:
   span=min(scene['seconds'],scene['voice_seconds']/scene['tempo'])*len(part)/total
   srt.extend([str(index),stamp(position)+' --> '+stamp(position+span),part,'']);position+=span;index+=1
 (OUT/'korean-captions.srt').write_text('\n'.join(srt),encoding='utf-8-sig')
 (OUT/'narration-ko.txt').write_text('\n\n'.join(s['id']+' '+s['title']+'\n'+s['narration'] for s in scenes),encoding='utf8')
 (OUT/'video-production.json').write_text(json.dumps({'type':'실제 앱 캡처+AI 발표자 기반 소개 영상; 실제 동작 녹화 아님','presenter_source':'Dreamina Seedance1.0Fast 720p,25existingcredits','voice':'ko-KR-InJoonNeural','output':'1920x1080','duration':duration(final),'scenes':scenes},ensure_ascii=False,indent=2),encoding='utf8')
 print('VIDEO_CREATED '+str(final),flush=True)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--speech-only',action='store_true');args=parser.parse_args()
 scenes=make_scenes();asyncio.run(speech(scenes))
 (BUILD/'scenes.json').write_text(json.dumps(scenes,ensure_ascii=False,indent=2),encoding='utf8')
 if not args.speech_only:render(scenes)
if __name__=='__main__':main()
