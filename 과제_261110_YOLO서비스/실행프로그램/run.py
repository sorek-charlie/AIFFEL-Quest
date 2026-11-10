from pathlib import Path
import argparse, json, hashlib, platform, sys, importlib.metadata as md
from datetime import datetime, timezone
import numpy as np
from PIL import Image, ImageOps, ImageDraw
from ultralytics import YOLO

BASE_DIR=Path(__file__).resolve().parent
p=argparse.ArgumentParser()
p.add_argument('--source', default=str(BASE_DIR/'input/bus.jpg'))
p.add_argument('--output', default=str(BASE_DIR.parent/'과제제출내용/outputs/local_run'))
a=p.parse_args()
source=Path(a.source).resolve(); out=Path(a.output); out.mkdir(parents=True,exist_ok=True)
summary=[]; runs=[]
for task, weights in [('detect','yolo26n.pt'),('segment','yolo26n-seg.pt')]:
    model=YOLO(str(BASE_DIR/weights))
    for conf in [0.25,0.50]:
        dest=out/f'{task}_{conf:.2f}'; dest.mkdir(exist_ok=True)
        r=model.predict(str(source),imgsz=640,device='cpu',conf=conf,retina_masks=True,verbose=False)[0]
        r.save(filename=str(dest/'result.jpg'))
        records=[]
        for i,b in enumerate(r.boxes):
            item={'id':i,'class_id':int(b.cls.item()),'class_name':r.names[int(b.cls.item())],'confidence':float(b.conf.item()),'xyxy':b.xyxy[0].tolist()}
            if r.masks is not None:
                mask=(r.masks.data[i].cpu().numpy()>0.5).astype('uint8')*255
                mp=dest/f'mask_{i:02d}.png'; Image.fromarray(mask).save(mp)
                with Image.open(mp) as check: assert check.size==(r.orig_shape[1],r.orig_shape[0])
                item.update(mask_file=mp.name,polygon_xy=r.masks.xy[i].tolist(),mask_pixels=int((mask>0).sum()))
            records.append(item)
        payload={'source':str(source),'image_width':r.orig_shape[1],'image_height':r.orig_shape[0],'coordinate_system':'xyxy pixels, origin top-left, x right, y down','task':task,'conf':conf,'objects':records}
        (dest/'boxes.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
        counts={n:sum(x['class_name']==n for x in records) for n in sorted(set(x['class_name'] for x in records))}
        summary.append({'task':task,'conf':conf,'count':len(records),'classes':counts})
        runs.append({'task':task,'weights':weights,'weights_sha256':hashlib.sha256(Path(model.ckpt_path).read_bytes()).hexdigest(),'conf':conf,'imgsz':640,'device':'cpu','retina_masks':True})
(out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
manifest={'created_utc':datetime.now(timezone.utc).isoformat(),'input':str(source),'input_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'input_origin':'User attached bus.jpg; original photographer and redistribution permission unverified','execution_cwd':str(Path.cwd()),'python':sys.version,'platform':platform.platform(),'versions':{n:md.version(n) for n in ['ultralytics','torch','torchvision','numpy','pillow']},'runs':runs,'additional_independent_image_tested':False}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
for task in ['detect','segment']:
    canvas=Image.new('RGB',(1080,760),'white'); d=ImageDraw.Draw(canvas)
    for j,conf in enumerate([0.25,0.50]):
        im=Image.open(out/f'{task}_{conf:.2f}'/'result.jpg'); im.thumbnail((530,715)); canvas.paste(im,(j*540,35));d.text((j*540+12,10),f'{task} | conf={conf:.2f}',fill='black')
    canvas.save(out/f'{task}_comparison.jpg')
print(json.dumps(summary,ensure_ascii=False,indent=2))
