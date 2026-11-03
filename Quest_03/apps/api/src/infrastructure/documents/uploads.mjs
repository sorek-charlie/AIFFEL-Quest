import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {requireValue} from '../../../../../packages/domain/src/index.mjs';
import {textCandidates} from '../../../../../packages/domain/src/tasks/extraction.mjs';
const exec=promisify(execFile);
export async function extractUpload(body,root){
 requireValue(typeof body.name==='string'&&body.name.length<=200&&typeof body.data==='string'&&body.data.length<=11200000&&/^[A-Za-z0-9+/]*={0,2}$/.test(body.data),'파일을 확인하세요.');
 const ext=body.name.toLowerCase().split('.').pop(),bytes=Buffer.from(body.data,'base64');
 requireValue(bytes.length>0&&bytes.length<=8*1024*1024,'파일은 8MB 이하여야 합니다.');
 requireValue(['txt','md','csv','json','docx','pdf','png','jpg','jpeg','bmp'].includes(ext),'TXT·MD·CSV·JSON·DOCX·PDF·PNG·JPG·BMP를 지원합니다. HWP는 PDF로 저장해 첨부하세요.');
 let text;
 if(['txt','md','csv','json'].includes(ext)){text=bytes.toString('utf8');if(text.includes('\ufffd'))text=new TextDecoder('euc-kr').decode(bytes);}
 else{
  const dir=mkdtempSync(join(tmpdir(),'schedule-upload-'));
  try{const path=join(dir,'document.'+ext);writeFileSync(path,bytes);
   try{const out=await exec('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(root,'apps/api/src/infrastructure/documents/extract.ps1'),'-FilePath',path],{windowsHide:true,timeout:60000,maxBuffer:1024*1024});text=out.stdout;}
   catch{requireValue(false,'파일을 읽지 못했습니다. PDF는 10쪽 이하인지, 이미지는 글자가 선명한지 확인하세요. Windows OCR 언어 팩이 필요할 수 있습니다.',422,'EXTRACTION_FAILED');}
  }finally{rmSync(dir,{recursive:true,force:true});}
 }
 requireValue(text?.trim(),'읽을 수 있는 글자가 없습니다.',422,'EXTRACTION_EMPTY');
 const candidates=textCandidates(text.slice(0,100000),body.name);
 requireValue(candidates.length,'일정이나 할 일로 읽을 내용이 없습니다.',422,'EXTRACTION_EMPTY');return candidates;
}
