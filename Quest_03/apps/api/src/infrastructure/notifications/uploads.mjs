import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {requireValue} from '../../../../../packages/domain/src/index.mjs';
import {textCandidates,parseIcs} from '../../../../../packages/domain/src/tasks/extraction.mjs';
const exec=promisify(execFile);
export async function extractUpload(body,root) {
 requireValue(typeof body.name==='string'&&typeof body.data==='string','파일을 선택하세요.');const ext=body.name.toLowerCase().split('.').pop(),bytes=Buffer.from(body.data,'base64');requireValue(bytes.length>0&&bytes.length<=8*1024*1024,'파일은 8MB 이하여야 합니다.');
 if(ext==='ics')return parseIcs(bytes.toString('utf8'));
 if(['txt','md','csv','json'].includes(ext)){let text=bytes.toString('utf8');if(text.includes('\ufffd'))text=new TextDecoder('euc-kr').decode(bytes);return textCandidates(text,body.name);}
 requireValue(['png','jpg','jpeg','bmp'].includes(ext),'TXT·MD·CSV·JSON·ICS·PNG·JPG·BMP 파일을 지원합니다. PDF·Word는 텍스트로 저장해 가져오세요.');
 const dir=mkdtempSync(join(tmpdir(),'orbit-ocr-'));try{const path=join(dir,'image.'+ext);writeFileSync(path,bytes);let output;try{output=await exec('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(root,'apps/api/src/infrastructure/notifications/extract-image.ps1'),'-ImagePath',path],{windowsHide:true,timeout:45000,maxBuffer:1024*1024});}catch{requireValue(false,'Windows OCR을 실행할 수 없습니다. 이미지 크기와 Windows 언어 팩을 확인하세요.',422,'OCR_UNAVAILABLE');}requireValue(output.stdout.trim(),'이미지에서 글자를 찾지 못했습니다.',422,'OCR_EMPTY');return textCandidates(output.stdout,body.name);}finally{rmSync(dir,{recursive:true,force:true});}
}
