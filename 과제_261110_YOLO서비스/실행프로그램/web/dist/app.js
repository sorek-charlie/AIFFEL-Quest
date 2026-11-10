import * as ort from './vendor/ort.wasm.min.mjs';
import {letterbox,decode,instanceMask} from './inference.js';
ort.env.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
const $=id=>document.getElementById(id);
const colors=['#80b94e','#ec9970','#6b9fc7','#ad85c0','#d8b54b','#68b6a5'];
let task='detect',image=null,imageName='bus.jpg',busy=false,current=null,metadata=null;
const sessions=new Map();let currentObjectURL=null;
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function setBusy(value){busy=value;for(const id of ['run','sample','file','detect','segment','confidence','compare'])$(id).disabled=value||(id==='run'&&!image)||(id==='confidence'&&$('compare').checked);$('run').querySelector('span').textContent=value?'분석 중…':'분석 시작';}
function clear(){current=null;$('result').hidden=true;$('empty').hidden=false;$('object-total').textContent='—';$('result-tag').textContent='OUTPUT';$('result-count').textContent='아직 분석하지 않았습니다';$('objects').innerHTML='<tr><td colspan="5" class="table-empty">분석 후 객체별 클래스, 점수, 좌표를 확인할 수 있습니다.</td></tr>';$('metrics').hidden=true;$('download-image').disabled=$('download-json').disabled=true;$('compare-card').hidden=true;$('image-grid').classList.remove('comparing');}
async function loadImage(source,name){
  if(busy)return;
  const img=new Image();img.decoding='async';img.src=source;
  await img.decode();
  if(img.naturalWidth*img.naturalHeight>40000000)throw new Error('사진 해상도가 너무 큽니다. 4천만 픽셀 이하 사진을 선택해 주세요.');
  const ratio=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  image=canvas;imageName=name;clear();
  $('original').width=canvas.width;$('original').height=canvas.height;$('original').getContext('2d').drawImage(canvas,0,0);
  $('image-info').textContent=canvas.width+' × '+canvas.height;$('filename').textContent=name;$('run').disabled=false;
  status(ratio<1?'큰 사진을 '+canvas.width+' × '+canvas.height+' 크기로 줄였습니다.':'사진 준비 완료 · 분석을 시작해 보세요.');
}
async function fileSelected(file){
  if(!file||busy)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return status('JPG, PNG, WEBP 사진을 선택해 주세요.',true);
  if(file.size>15*1024*1024)return status('15 MB 이하 사진을 선택해 주세요.',true);
  const url=URL.createObjectURL(file);
  try{await loadImage(url,file.name);if(currentObjectURL)URL.revokeObjectURL(currentObjectURL);currentObjectURL=url;}
  catch(error){URL.revokeObjectURL(url);status('사진을 열 수 없습니다. '+error.message,true);}
  $('file').value='';
}
async function getSession(mode){
  if(sessions.has(mode))return sessions.get(mode);
  const promise=(async()=>{
    status((mode==='detect'?'탐지':'분할')+' 모델을 불러오는 중입니다. 처음 실행은 조금 걸립니다.');
    const response=await fetch('./models/'+mode+'.onnx');
    if(!response.ok)throw new Error('모델 파일을 불러오지 못했습니다. 네트워크를 확인해 주세요.');
    const buffer=await response.arrayBuffer();
    return ort.InferenceSession.create(buffer,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  })();
  sessions.set(mode,promise);
  try{return await promise;}catch(error){sessions.delete(mode);throw error;}
}
function selectedObjects(threshold){return current.objects.filter(object=>object.confidence>=threshold);}
function draw(canvas,objects){
  canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  if(current.task==='segment'){
    const layer=ctx.getImageData(0,0,image.width,image.height);
    for(const object of objects){
      const mask=instanceMask(object,current.prototype,current.transform);
      const hex=colors[object.id%colors.length];const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
      for(let i=0;i<mask.pixels.length;i++)if(mask.pixels[i])for(let c=0;c<3;c++)layer.data[i*4+c]=Math.round(layer.data[i*4+c]*.55+rgb[c]*.45);
    }
    ctx.putImageData(layer,0,0);
  }
  const line=Math.max(2,image.width/280),font=Math.max(13,Math.round(image.width/48));ctx.lineWidth=line;ctx.font='600 '+font+'px sans-serif';
  for(const object of objects){
    const [x1,y1,x2,y2]=object.xyxy,color=colors[object.id%colors.length];
    const text=object.class_name+' '+object.confidence.toFixed(2),textWidth=ctx.measureText(text).width+12;
    ctx.strokeStyle=color;ctx.strokeRect(x1,y1,x2-x1,y2-y1);
    const top=Math.max(0,y1-font-10);ctx.fillStyle=color;ctx.fillRect(Math.min(x1,image.width-textWidth),top,textWidth,font+8);
    ctx.fillStyle='#10251e';ctx.fillText(text,Math.min(x1,image.width-textWidth)+6,top+font+1);
  }
}
function jsonPayload(objects,threshold){return {source:imageName,image_width:image.width,image_height:image.height,coordinate_system:'xyxy pixels, origin top-left, x right, y down',task:current.task,conf:threshold,iou:0.7,engine:'onnxruntime-web / wasm',objects:objects.map(object=>({id:object.id,class_id:object.class_id,class_name:object.class_name,confidence:object.confidence,xyxy:object.xyxy,...(current.task==='segment'?{mask_pixels:object.mask_pixels,mask_file:'mask_'+String(object.id).padStart(2,'0')+'.png'}:{})}))};}
function render(){
  if(!current)return;
  const compare=$('compare').checked,threshold=compare ? 0.25 : Number($('confidence').value),objects=selectedObjects(threshold);
  draw($('result'),objects);$('result').hidden=false;$('empty').hidden=true;
  $('result-title').textContent=compare?'임계값 0.25':current.task==='detect'?'객체 탐지 결과':'인스턴스 분할 결과';
  $('result-tag').textContent='CONF '+threshold.toFixed(2);$('object-total').textContent=objects.length;
  $('result-count').textContent=objects.length+'개 객체 · '+current.elapsed.toFixed(2)+'초';
  $('compare-card').hidden=!compare;$('image-grid').classList.toggle('comparing',compare);
  if(compare){const other=selectedObjects(.5);draw($('comparison'),other);$('comparison-count').textContent=other.length+'개 객체 · conf 0.50';}
  $('metrics').replaceChildren();const counts={};for(const object of objects)counts[object.class_name]=(counts[object.class_name]||0)+1;
  for(const [name,total]of Object.entries(counts)){const span=document.createElement('span');span.className='metric';span.textContent=name+' '+total;$('metrics').append(span);}
  $('metrics').hidden=!objects.length;$('objects').replaceChildren();
  if(!objects.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.className='table-empty';td.textContent='이 임계값에서 검출된 객체가 없습니다. 임계값을 낮춰 보세요.';tr.append(td);$('objects').append(tr);}
  for(const object of objects){
    const tr=document.createElement('tr');
    for(const value of ['#'+String(object.id+1).padStart(2,'0'),object.class_name,(object.confidence*100).toFixed(1)+'%',object.xyxy.map(n=>n.toFixed(1)).join(', ')]){const td=document.createElement('td');td.textContent=value;tr.append(td);}
    const td=document.createElement('td');
    if(current.task==='segment'){const button=document.createElement('button');button.className='mask-button';button.textContent='PNG ↓';button.setAttribute('aria-label','객체 '+object.id+' 마스크 저장');button.onclick=()=>downloadMask(object);td.append(button);}else td.textContent='—';
    tr.append(td);$('objects').append(tr);
  }
  $('download-image').disabled=$('download-json').disabled=false;
}
async function analyze(){
  if(!image||busy)return;clear();setBusy(true);
  let input,outputs;
  try{
    if(!metadata){const response=await fetch('./models/metadata.json');if(!response.ok)throw new Error('모델 정보를 불러오지 못했습니다.');metadata=await response.json();}
    const session=await getSession(task);status('사진을 분석하고 있습니다…');await new Promise(resolve=>setTimeout(resolve,30));
    const transform=letterbox(image);input=new ort.Tensor('float32',transform.data,[1,3,640,640]);
    const start=performance.now();outputs=await session.run({[session.inputNames[0]]:input});
    const output=outputs[session.outputNames[0]],objects=decode(output,transform,metadata[task].names);
    const proto=task==='segment'?outputs[session.outputNames[1]]:null;
    current={task,objects,transform,elapsed:(performance.now()-start)/1000,prototype:proto?{dims:[...proto.dims],data:Float32Array.from(proto.data)}:null};
    render();status('분석 완료 · 임계값을 바꾸면 결과가 바로 반영됩니다.');
  }catch(error){console.error(error);clear();status('분석하지 못했습니다. '+error.message,true);}
  finally{input?.dispose();if(outputs)for(const tensor of Object.values(outputs))tensor.dispose();setBusy(false);}
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);}
function downloadCanvas(canvas,name){canvas.toBlob(blob=>blob&&download(blob,name),'image/png');}
function downloadMask(object){
  const mask=instanceMask(object,current.prototype,current.transform),canvas=document.createElement('canvas');canvas.width=mask.width;canvas.height=mask.height;
  const ctx=canvas.getContext('2d'),data=ctx.createImageData(mask.width,mask.height);
  for(let i=0;i<mask.pixels.length;i++){data.data[i*4]=data.data[i*4+1]=data.data[i*4+2]=mask.pixels[i];data.data[i*4+3]=255;}
  ctx.putImageData(data,0,0);downloadCanvas(canvas,'mask_'+String(object.id).padStart(2,'0')+'.png');
}
$('file').addEventListener('change',event=>fileSelected(event.target.files[0]));
for(const type of ['dragover','dragenter'])$('dropzone').addEventListener(type,event=>{event.preventDefault();if(!busy)$('dropzone').classList.add('drag');});
for(const type of ['dragleave','drop'])$('dropzone').addEventListener(type,event=>{event.preventDefault();$('dropzone').classList.remove('drag');if(type==='drop')fileSelected(event.dataTransfer.files[0]);});
$('sample').onclick=()=>loadImage('./assets/bus.jpg','bus.jpg').catch(error=>status(error.message,true));
for(const mode of ['detect','segment'])$(mode).onclick=()=>{
  if(busy||task===mode)return;task=mode;
  for(const button of ['detect','segment']){$(button).classList.toggle('selected',button===mode);$(button).setAttribute('aria-pressed',String(button===mode));}
  $('mode-help').textContent=mode==='detect'?'사각형 박스로 객체의 위치를 찾습니다.':'각 객체의 예측 영역을 픽셀 단위로 구분합니다.';clear();status('분석 방식을 바꿨습니다. 분석 시작을 눌러주세요.');
};
$('confidence').oninput=()=>{$('confidence-value').textContent=Number($('confidence').value).toFixed(2);render();};
$('compare').onchange=()=>{$('confidence').disabled=$('compare').checked;if(current)render();};
$('run').onclick=analyze;
$('download-image').onclick=()=>downloadCanvas($('result'),task+'_result.png');
$('download-compare').onclick=()=>downloadCanvas($('comparison'),task+'_conf_0.50.png');
$('download-json').onclick=()=>{if(current){const threshold=$('compare').checked ? 0.25 : Number($('confidence').value);download(new Blob([JSON.stringify(jsonPayload(selectedObjects(threshold),threshold),null,2)],{type:'application/json'}),'boxes.json');}};
loadImage('./assets/bus.jpg','bus.jpg').catch(error=>status('예제 사진을 불러오지 못했습니다. '+error.message,true));
