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
 let text,metadata;
 const pageFrom=body.pageFrom===undefined?1:Number(body.pageFrom),pageTo=body.pageTo===undefined?pageFrom+9:Number(body.pageTo);
 if(ext==='pdf'){requireValue(Number.isInteger(pageFrom)&&Number.isInteger(pageTo)&&pageFrom>=1&&pageTo>=pageFrom&&pageTo-pageFrom<10,'PDF 페이지는 한 번에 최대 10쪽을 지정하세요.');requireValue(bytes.subarray(0,1024).includes(Buffer.from('%PDF-')),'올바른 PDF 파일이 아닙니다. PDF로 다시 저장한 뒤 첨부하세요.',422,'INVALID_PDF');}
 if(['txt','md','csv','json'].includes(ext)){text=bytes.toString('utf8');if(text.includes('\ufffd'))text=new TextDecoder('euc-kr').decode(bytes);}
 else{
  const dir=mkdtempSync(join(tmpdir(),'schedule-upload-'));
  try{const path=join(dir,'document.'+ext);writeFileSync(path,bytes);
   try{const out=await exec('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(root,'apps/api/src/infrastructure/documents/extract.ps1'),'-FilePath',path,...(ext==='pdf'?['-StartPage',String(pageFrom),'-EndPage',String(pageTo)]:[])],{windowsHide:true,timeout:60000,maxBuffer:1024*1024});text=out.stdout;if(ext==='pdf'){const header=text.match(/^__PDF_PAGES__ (\d+) (\d+) (\d+)\r?\n/);if(header){metadata={totalPages:Number(header[1]),from:Number(header[2]),to:Number(header[3])};text=text.slice(header[0].length);}}}
   catch(e){const reason=String(e.stderr||'');const message=e.killed?'파일 읽기 시간이 초과됐습니다. PDF 페이지 범위를 줄여 다시 첨부하세요.':reason.includes('PAGE_RANGE')?'시작 페이지가 PDF 전체 페이지 수보다 큽니다. 페이지 범위를 확인하세요.':/password|암호|0x8007052e/i.test(reason)?'암호로 보호된 PDF입니다. 본인이 열 수 있는 PDF를 암호 없이 저장해 첨부하세요.':reason.includes('OCR language unavailable')?'Windows OCR 언어 팩이 없습니다. Windows 언어 설정에서 한국어·영어 OCR을 설치하세요.':reason.includes('Image too large')?'이미지 크기가 너무 큽니다. 크기를 줄여 다시 첨부하세요.':ext==='pdf'?'PDF를 읽지 못했습니다. 파일이 정상적으로 열리는지 확인하고, 다른 이름으로 PDF를 저장해 다시 첨부하세요.':ext==='docx'?'Word 문서를 읽지 못했습니다. DOCX 형식으로 다시 저장하세요.':'이미지를 읽지 못했습니다. PNG·JPG로 다시 저장해 첨부하세요.';requireValue(false,message,422,e.killed?'EXTRACTION_TIMEOUT':'EXTRACTION_FAILED');}
  }finally{rmSync(dir,{recursive:true,force:true});}
 }
 requireValue(text?.trim(),'읽을 수 있는 글자가 없습니다.',422,'EXTRACTION_EMPTY');
 const candidates=textCandidates(text.slice(0,100000),body.name);
 requireValue(candidates.length,'일정이나 할 일로 읽을 내용이 없습니다.',422,'EXTRACTION_EMPTY');if(metadata)candidates.metadata=metadata;return candidates;
}
