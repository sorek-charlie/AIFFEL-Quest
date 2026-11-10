from pathlib import Path
import shutil, json, hashlib
from ultralytics import YOLO
import onnx
root=Path(__file__).resolve().parent
out=root/'web/dist/models'
out.mkdir(parents=True,exist_ok=True)
info={}
for task,filename in [('detect','yolo26n.pt'),('segment','yolo26n-seg.pt')]:
    model=YOLO(str(root/filename))
    exported=Path(model.export(format='onnx',imgsz=640,opset=17,simplify=True,dynamic=False,device='cpu',batch=1,half=False))
    graph=onnx.load(str(exported)); onnx.checker.check_model(graph)
    shutil.copy2(exported,out/(task+'.onnx'))
    info[task]={'file':task+'.onnx','sha256':hashlib.sha256((out/(task+'.onnx')).read_bytes()).hexdigest(),'names':model.names,'outputs':{o.name:[d.dim_value for d in o.type.tensor_type.shape.dim] for o in graph.graph.output}}
    print(task,info[task],flush=True)
(out/'metadata.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
