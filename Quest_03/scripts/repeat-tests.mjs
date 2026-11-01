import {spawnSync} from 'node:child_process';
import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const count=Number(process.argv[2]||100);if(!Number.isInteger(count)||count<1||count>1000)throw new Error('Repeat count must be 1..1000');
const files=['unit','integration'].flatMap(folder=>readdirSync(`tests/${folder}`).filter(n=>n.endsWith('.test.mjs')).map(n=>`tests/${folder}/${n}`));
mkdirSync('build/test-runs',{recursive:true});const start=new Date(),runs=[];
for(let i=1;i<=count;i++){
 const begin=Date.now(),result=spawnSync(process.execPath,['--test','--test-reporter=tap',...files],{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:4*1024*1024});const output=(result.stdout||'')+(result.stderr||'');const tests=Number(output.match(/# tests (\d+)/)?.[1]||0);const failures=Number(output.match(/# fail (\d+)/)?.[1]||0);runs.push({run:i,ok:result.status===0&&tests>0&&failures===0,tests,failures,milliseconds:Date.now()-begin});if(!runs.at(-1).ok)writeFileSync(`build/test-runs/failure-${i}.log`,output+'\n'+String(result.error||''));if(i%10===0||i===count)console.log(`Progress ${i}/${count}: ${runs.filter(r=>r.ok).length} passing runs`);
}
const report={startedAt:start.toISOString(),finishedAt:new Date().toISOString(),requestedRuns:count,passedRuns:runs.filter(r=>r.ok).length,failedRuns:runs.filter(r=>!r.ok).length,totalTestExecutions:runs.reduce((n,r)=>n+r.tests,0),runs};writeFileSync(resolve('build/test-runs/report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,runs:undefined}));if(report.failedRuns)process.exitCode=1;
