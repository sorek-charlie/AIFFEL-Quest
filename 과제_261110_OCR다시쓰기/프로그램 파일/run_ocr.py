from pathlib import Path
import os, json, hashlib, platform, sys, importlib.metadata as md
os.environ.setdefault('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK','True')
from paddleocr import PaddleOCR
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent; src=root/'input/census-table.png';out=root.parent/'참고자료/outputs/ocr';out.mkdir(parents=True,exist_ok=True)
config=dict(lang='en',ocr_version='PP-OCRv4',use_doc_orientation_classify=False,use_doc_unwarping=False,use_textline_orientation=False,device='cpu',enable_mkldnn=False)
ocr=PaddleOCR(**config)
for result in ocr.predict(str(src)):
 result.save_to_json(str(out/'raw_ocr.json'))
 result.save_to_img(str(out))
 data=result.json
 if isinstance(data,str):data=json.loads(data)
 data=data.get('res',data)
 records=[]
 for i,(t,s,p) in enumerate(zip(data['rec_texts'],data['rec_scores'],data['rec_polys'])):
  records.append({'id':i,'text':t,'score':float(s),'polygon':p.tolist() if hasattr(p,'tolist') else p})
 (out/'text_coordinates.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
 (out/'raw_text.txt').write_text('\n'.join(f"{x['id']:03d}\t{x['score']:.4f}\t{x['text']}" for x in records),encoding='utf-8')
 im=Image.open(src).convert('RGB');d=ImageDraw.Draw(im)
 for x in records:
  poly=[tuple(p) for p in x['polygon']];d.line(poly+[poly[0]],fill='red',width=1);d.text(poly[0],str(x['id']),fill='blue')
 im.save(out/'ocr_regions.png')
 import shutil;shutil.copy2(src,out/'input_copy.png')
 manifest={'input':'input/census-table.png','input_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'source_url':'https://www2.census.gov/library/publications/decennial/1910/volume-1/volume-1-p3.pdf','source_pdf_page':2,'printed_page':22,'dpi':200,'crop_xyxy':[675,785,1760,1290],'crop_origin':'pixels of rendered full page, top-left origin','execution_location':str(root),'python':sys.version,'platform':platform.platform(),'versions':{n:md.version(n) for n in ['paddleocr','paddlepaddle','paddlex','pillow']},'configuration':config,'model_names':['PP-OCRv4_mobile_det','en_PP-OCRv4_mobile_rec'],'ocr_region_count':len(records),'table_reconstruction':'manual row/column assignment with source-image review; see reviewed_cells.json and review_log.csv','preprocessing':'200 dpi render + crop only; no thresholding/deskew; orientation modules disabled for upright table'}
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(records,ensure_ascii=False,indent=2))
