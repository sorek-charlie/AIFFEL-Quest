// Fictional, parser-compatible teaching fixture. No customer source is used.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL, fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const packages=process.env.ARTIFACT_NODE_MODULES;
if(!packages) throw new Error('Set ARTIFACT_NODE_MODULES to the bundled runtime node_modules directory.');
const require=createRequire(path.join(packages,'../package.json'));
const {Workbook,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const out=path.join(root,'outputs/main-quest');
await fs.mkdir(out,{recursive:true});
const wb=Workbook.create(),s=wb.worksheets.add('법인사업자_종합');
const data=[
 ['구분','항목','2021년','2022년','2023년','2024년','2025년'],
 ['가상자료','사업자번호','0000000000','0000000000','0000000000','0000000000','0000000000'],
 ['단위: 원','과세표준',80000000,100000000,120000000,140000000,160000000],
 ['가상 입력값','산출세액',7200000,9000000,10800000,12600000,14400000],
 ['가상 입력값','총부담세액',7200000,9000000,10800000,12600000,14400000],
 ['가상 입력값','최저한세적용대상공제감면세액',0,0,0,0,0],
 ];
s.getRange('A1:G6').values=data;
s.getRange('A1:G6').format.font={name:'Malgun Gothic',size:11};
s.getRange('A1:G6').format.rowHeight=28;
s.getRange('A1:G6').format.verticalAlignment='center';
s.getRange('A1:G1').format.fill='#20364D';
s.getRange('A1:G1').format.font={name:'Malgun Gothic',size:11,bold:true,color:'#FFFFFF'};
s.getRange('A1:G1').format.horizontalAlignment='center';
s.getRange('A1:A6').format.columnWidth=18;
s.getRange('B1:B6').format.columnWidth=42;
s.getRange('C1:G6').format.columnWidth=19;
s.getRange('C3:G6').setNumberFormat('#,##0');
s.getRange('C3:G6').format.horizontalAlignment='right';
s.getRange('C2:G2').setNumberFormat('0000000000');
s.getRange('A8').values=[['SYNTHETIC ONLY — 실재 회사·개인 자료 없음']];
s.getRange('A9').values=[['출처: 제출 시연을 위해 독립적으로 만든 임의의 수치. 실제 세액 계산 예시가 아님.']];
s.getRange('A10').values=[['근로자·보험료·기신고 공제 자료는 의도적으로 생략. 0원은 환급 불가 확정의 뜻이 아님.']];
s.getRange('A8:G10').format.font={name:'Malgun Gothic',size:11,color:'#4B5563'};
s.showGridLines=false;
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'법인사업자_종합!A1:G6',include:'values',tableMaxRows:6,tableMaxCols:7,maxChars:3500})).ndjson);
const preview=await wb.render({sheetName:'법인사업자_종합',range:'A1:G11',scale:1,format:'png'});
await fs.mkdir(path.join(root,'dev/build/submission'),{recursive:true});
await fs.writeFile(path.join(root,'dev/build/submission/sample-preview.png'),new Uint8Array(await preview.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,'synthetic-tax-summary.xlsx'));
console.log('Created synthetic-tax-summary.xlsx');
