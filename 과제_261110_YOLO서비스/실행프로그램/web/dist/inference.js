// Fixed-shape YOLO26 ONNX exports: [1, 84(+32), 8400], plus mask prototypes.
// Class-aware NMS matches the Python CLI's default IoU threshold (0.70).
export function letterbox(image) {
  const width=image.width, height=image.height;
  const scale=Math.min(640/width,640/height);
  const resizedWidth=Math.round(width*scale), resizedHeight=Math.round(height*scale);
  const padX=Math.round((640-resizedWidth)/2-0.1), padY=Math.round((640-resizedHeight)/2-0.1);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=640;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,640,640);
  ctx.drawImage(image,0,0,width,height,padX,padY,resizedWidth,resizedHeight);
  const pixels=ctx.getImageData(0,0,640,640).data;
  const data=new Float32Array(3*640*640), plane=640*640;
  for(let i=0;i<plane;i++){data[i]=pixels[i*4]/255;data[plane+i]=pixels[i*4+1]/255;data[2*plane+i]=pixels[i*4+2]/255;}
  return {data,width,height,scale,padX,padY};
}
function iou(a,b){
  const intersection=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
  const areaA=Math.max(0,a[2]-a[0])*Math.max(0,a[3]-a[1]);
  const areaB=Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1]);
  return intersection/(areaA+areaB-intersection+1e-8);
}
export function decode(output,transform,names){
  const {data,dims}=output, channels=dims[1], count=dims[2];
  if(dims.length!==3 || ![84,116].includes(channels))throw new Error('지원하지 않는 모델 출력 형태입니다.');
  const candidates=[];
  for(let i=0;i<count;i++){
    let confidence=0, classId=0;
    for(let c=0;c<80;c++){const value=data[(4+c)*count+i];if(value>confidence){confidence=value;classId=c;}}
    if(confidence<0.05)continue;
    const cx=data[i],cy=data[count+i],w=data[2*count+i],h=data[3*count+i];
    const box640=[cx-w/2,cy-h/2,cx+w/2,cy+h/2];
    const xyxy=box640.map((v,k)=>Math.min(k%2?transform.height:transform.width,Math.max(0,(v-(k%2?transform.padY:transform.padX))/transform.scale)));
    if(xyxy[2]<=xyxy[0] || xyxy[3]<=xyxy[1])continue;
    const coefficients=channels===116?Float32Array.from({length:32},(_,j)=>data[(84+j)*count+i]):null;
    candidates.push({class_id:classId,class_name:names[classId]||String(classId),confidence,xyxy,box640,coefficients});
  }
  candidates.sort((a,b)=>b.confidence-a.confidence);
  const kept=[];
  for(const candidate of candidates.slice(0,3000)){
    if(kept.some(prior=>prior.class_id===candidate.class_id&&iou(prior.xyxy,candidate.xyxy)>0.7))continue;
    candidate.id=kept.length;kept.push(candidate);if(kept.length>=100)break;
  }
  return kept;
}
export function instanceMask(object,prototype,transform){
  if(object.mask)return object.mask;
  const [,channels,h,w]=prototype.dims, plane=h*w, logits=new Float32Array(plane);
  for(let c=0;c<channels;c++){
    const coefficient=object.coefficients[c];
    for(let i=0;i<plane;i++)logits[i]+=coefficient*prototype.data[c*plane+i];
  }
  const {width,height,scale,padX,padY}=transform;
  const pixels=new Uint8Array(width*height), [x1,y1,x2,y2]=object.xyxy;let total=0;
  for(let y=Math.max(0,Math.floor(y1));y<Math.min(height,Math.ceil(y2));y++){
    const fy=(y+0.5)*scale*h/640+padY*h/640-0.5;
    const ya=Math.max(0,Math.min(h-1,Math.floor(fy))),yb=Math.min(h-1,ya+1),dy=Math.max(0,fy-ya);
    for(let x=Math.max(0,Math.floor(x1));x<Math.min(width,Math.ceil(x2));x++){
      const fx=(x+0.5)*scale*w/640+padX*w/640-0.5;
      const xa=Math.max(0,Math.min(w-1,Math.floor(fx))),xb=Math.min(w-1,xa+1),dx=Math.max(0,fx-xa);
      const top=logits[ya*w+xa]*(1-dx)+logits[ya*w+xb]*dx;
      const bottom=logits[yb*w+xa]*(1-dx)+logits[yb*w+xb]*dx;
      if(top*(1-dy)+bottom*dy>0){pixels[y*width+x]=255;total++;}
    }
  }
  object.mask_pixels=total;object.mask={pixels,width,height};return object.mask;
}
