"""Author a reproducible prompt-timeline LED animation; not learned GD motion."""
from pathlib import Path
import json, math, subprocess
import cv2
import numpy as np

ROOT=Path(__file__).resolve().parent.parent/'samples'
FPS=24
PHASES=[(0,2,'오른손 대각선 인사'),(2,4,'양팔 V자와 무릎 바운스'),(4,6,'좌우 번갈아 팔 밀기'),(6,8,'좌우 사이드 스텝'),(8,10,'무릎 번갈아 들기'),(10,12,'상체 숙였다 펴기'),(12,14,'팔 교차 후 펼치기'),(14,16,'머리 위 팔 웨이브'),(16,18,'무릎 들기와 팔 펌핑'),(18,20.5,'시작 자세로 돌아와 마무리')]
def pose(t,cx):
    phase=next(i for i,(a,b,_) in enumerate(PHASES) if a<=t<b)
    s=math.sin(2*math.pi*2*t); bounce=.008*math.cos(2*math.pi*2*t)
    x=cx+(.018*math.sin(math.pi*t) if phase==3 else .005*s)
    y=bounce+(.035*(1-math.cos(math.pi*(t-10))) if phase==5 else 0)
    p=np.array([[x,.16+y],[x,.24+y],[x-.04,.25+y],[x-.07,.36+y],[x-.09,.46+y],[x+.04,.25+y],[x+.07,.36+y],[x+.09,.46+y],[x-.025,.50+y],[x-.03,.69],[x-.04,.89],[x+.025,.50+y],[x+.03,.69],[x+.04,.89]],dtype=float)
    angles=[(-1.9+.25*s,.3),( -2.4,2.4),(-1.1*s,1.1*s),(.4*s,-.4*s),(.5*s,-.5*s),(.3,.3),(-1.5*s,1.5*s),(-2.6+.4*s,2.6+.4*s),(.8*s,-.8*s),(-1.9*(max(0,20-t)/2),.2)]
    for shoulder,elbow,wrist,theta in [(2,3,4,angles[phase][0]),(5,6,7,angles[phase][1])]:
        p[elbow]=p[shoulder]+[.08*math.sin(theta),.12*math.cos(theta)]
        p[wrist]=p[elbow]+[.08*math.sin(theta+.25*s),.12*math.cos(theta+.25*s)]
    if phase in (4,8):
        for knee,ankle,v in [(9,10,max(0,s)),(12,13,max(0,-s))]:
            p[knee,1]-=.12*v; p[ankle,1]-=.16*v
    return p

edges=[(1,2),(2,3),(3,4),(1,5),(5,6),(6,7),(1,8),(8,9),(9,10),(1,11),(11,12),(12,13)]
writer=cv2.VideoWriter(str(ROOT/'led_silent_20_5s.mp4'),cv2.VideoWriter_fourcc(*'mp4v'),FPS,(1080,720))
if not writer.isOpened(): raise RuntimeError('Video writer failed')
frames=[]
for n in range(492):
    t=n/FPS; layer=np.zeros((720,1080,3),np.uint8); people=[]
    for cx in (.33,.67):
        p=pose(t,cx); people.append(p.round(5).tolist()); pts=(p*[1080,720]).astype(int)
        for a,b in edges:
            cv2.line(layer,tuple(pts[a]),tuple(pts[b]),(15,20,210),4,cv2.LINE_AA)
            for u in np.linspace(0,1,12):
                q=(pts[a]*(1-u)+pts[b]*u).astype(int); cv2.circle(layer,tuple(q),3,(130,180,255),-1,cv2.LINE_AA)
        cv2.ellipse(layer,tuple(pts[0]),(19,30),0,0,360,(80,120,255),4,cv2.LINE_AA)
        for q in pts[1:]: cv2.circle(layer,tuple(q),5,(170,210,255),-1,cv2.LINE_AA)
    frame=cv2.addWeighted(layer,1,cv2.GaussianBlur(layer,(0,0),9),.9,0)
    writer.write(frame); frames.append({'time':t,'people':people})
    if n==96:
        from PIL import Image
        Image.fromarray(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)).save(ROOT/'led_preview.jpg')
writer.release()
def run(*args): subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)],check=True)
audio=ROOT.parent/'source_media/reference_audio_source.mp4'
if not audio.is_file(): audio=ROOT.parent/'dance_final_41s.mp4'
run('-i',ROOT/'led_silent_20_5s.mp4','-i',audio,'-map','0:v:0','-map','1:a:0','-t','20.5','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',ROOT/'led_motion_20_5s.mp4')
run('-stream_loop','1','-i',ROOT/'led_motion_20_5s.mp4','-t','41','-c:v','libx264','-crf','18','-c:a','aac','-movflags','+faststart',ROOT/'led_motion_41s.mp4')
(ROOT/'joint_timeline.json').write_text(json.dumps({'fps':FPS,'cycle_seconds':20.5,'repeat':2,'provenance':'Authored procedural choreography, not extracted GD motion','frames':frames}),encoding='utf-8')
prompt='Two fictional adult blonde women, age 25, beautiful original faces, full-body frontal view. Left dancer wears a white sports jacket, right dancer a red sports jacket, both black trousers and white sneakers. Rebuild both LED figures as the two women in the reference image. Precisely preserve both figures\' shoulder, elbow, wrist, hip, knee and ankle trajectories, choreography, spacing and timing. Dark concert stage, subtle blue and pink light, natural anatomy, consistent faces and clothing, fixed camera, feet visible throughout. No LEDs on their bodies, no text, no extra people. Preserve motion rather than inventing new choreography.'
(ROOT/'higgsfield_prompt.txt').write_text(prompt,encoding='utf-8')
lines=['# 41초 프롬프트 → LED → 인물 영상 제작','', '20.5초 동작을 두 번 반복합니다. 아래 LED는 시간표로 직접 작성한 관절 애니메이션이며 GD의 실제 동작을 추출한 결과가 아닙니다. 원본 녹화의 음악과 현장 소리를 사용하므로 깨끗한 음원과 다릅니다. 박자 일치는 최종 생성 후 청취 검수가 필요합니다.','', '| 시간(초) | 관절 동작 프롬프트 |','|---|---|']
for offset in (0,20.5):
    for a,b,label in PHASES: lines.append(f'| {a+offset:g}–{b+offset:g} | 두 LED 인물이 {label}. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |')
lines+=['','## Higgsfield Genjutsu 입력','',prompt,'','- 모드: Motion transfer','- 영상: led_motion_20_5s.mp4','- 참조: blonde_dancers_reference.png','- 결과 20.5초를 두 번 이어 붙이고 기존 오디오를 맞춰 41초로 저장','- 현재 인물 영상: 생성 대기. LED 영상은 인물 생성 완료본이 아닙니다.']
(ROOT/'prompts_41s.md').write_text('\n'.join(lines),encoding='utf-8')
print('LED_ASSETS_READY')
