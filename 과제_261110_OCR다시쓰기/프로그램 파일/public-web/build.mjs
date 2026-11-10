import {cpSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const base=import.meta.dirname;
const dist=path.join(base,'dist');mkdirSync(dist,{recursive:true});cpSync(path.join(base,'src'),dist,{recursive:true});
function copy(from,to){mkdirSync(path.dirname(path.join(dist,to)),{recursive:true});cpSync(path.join(base,'node_modules',from),path.join(dist,to),{recursive:true});}
copy('tesseract.js/dist/tesseract.min.js','vendor/tesseract/tesseract.min.js');
copy('tesseract.js/dist/worker.min.js','vendor/tesseract/worker.min.js');
for(const file of readdirSync(path.join(base,'node_modules/tesseract.js-core'))){if(file.endsWith('.wasm.js'))copy('tesseract.js-core/'+file,'vendor/core/'+file);}
for(const lang of ['eng','kor'])copy('@tesseract.js-data/'+lang+'/4.0.0_best_int/'+lang+'.traineddata.gz','vendor/lang/'+lang+'.traineddata.gz');
for(const file of ['pdf.mjs','pdf.worker.mjs'])copy('pdfjs-dist/build/'+file,'vendor/pdf/'+file);
for(const dir of ['cmaps','standard_fonts','wasm'])copy('pdfjs-dist/'+dir,'vendor/pdf/'+dir);
for(const pkg of ['tesseract.js','tesseract.js-core','pdfjs-dist']){if(existsSync(path.join(base,'node_modules',pkg,'LICENSE')))copy(pkg+'/LICENSE','vendor/licenses/'+pkg+'.txt');}
console.log('Built public browser OCR site: dist/');
