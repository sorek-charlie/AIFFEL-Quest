"""Join locally downloaded clips, loop if short, and mux audio into a 41s MP4."""
from pathlib import Path
import argparse,json,shutil,subprocess,tempfile

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)],encoding='utf-8'))
def render(clips,audio,output,duration=41):
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise RuntimeError('FFmpeg를 설치하고 PATH에 추가한 뒤 다시 실행하세요.')
    clips=[Path(p).resolve() for p in clips];audio=Path(audio).resolve();output=Path(output).resolve()
    if not clips or len(clips)>12:raise ValueError('영상 클립은 1~12개를 선택하세요.')
    if not 1<=float(duration)<=120:raise ValueError('길이는 1~120초여야 합니다.')
    if output in clips or output==audio:raise ValueError('출력은 입력과 다른 파일이어야 합니다.')
    for p in clips:
        if not any(s['codec_type']=='video' for s in probe(p)['streams']):raise ValueError('영상 트랙이 없습니다: '+p.name)
    if not any(s['codec_type']=='audio' for s in probe(audio)['streams']):raise ValueError('선택한 음원에 오디오 트랙이 없습니다.')
    output.parent.mkdir(parents=True,exist_ok=True)
    def ff(*args):
        r=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True,encoding='utf-8',errors='replace')
        if r.returncode:raise RuntimeError(r.stderr[-2000:])
    with tempfile.TemporaryDirectory(dir=output.parent,prefix='encode_') as tmp:
        tmp=Path(tmp)
        for i,p in enumerate(clips):
            ff('-i',p,'-t',duration,'-an','-vf','scale=960:640:force_original_aspect_ratio=decrease,pad=960:640:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24','-c:v','libx264','-preset','veryfast','-threads','2','-crf','19','-pix_fmt','yuv420p',tmp/f'{i:02d}.mp4')
        (tmp/'concat.txt').write_text('\n'.join(f"file '{i:02d}.mp4'" for i in range(len(clips))),encoding='utf-8')
        ff('-f','concat','-safe','0','-i',tmp/'concat.txt','-c','copy',tmp/'joined.mp4')
        ff('-stream_loop','-1','-i',tmp/'joined.mp4','-stream_loop','-1','-i',audio,'-map','0:v:0','-map','1:a:0','-t',duration,'-c:v','copy','-af',f'afade=t=out:st={max(0,float(duration)-.3)}:d=0.3','-c:a','aac','-b:a','192k','-movflags','+faststart',output)
    info=probe(output)
    if abs(float(info['format']['duration'])-float(duration))>.1:raise RuntimeError('최종 길이 검증에 실패했습니다.')
    manifest={'clips':[p.name for p in clips],'audio':audio.name,'duration':float(info['format']['duration']),'output':output.name,'short_clips':'concatenate then loop if needed','streams':[s['codec_type'] for s in info['streams']]}
    output.with_suffix('.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('clips',nargs='+');p.add_argument('--audio',required=True);p.add_argument('--output',default='renders/final_41s.mp4');p.add_argument('--duration',type=float,default=41)
    a=p.parse_args();print(json.dumps(render(a.clips,a.audio,a.output,a.duration),ensure_ascii=False))
