import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'project.manifest.json'), 'utf8'));
const failures = [];
const skipped = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.playwright-mcp', 'Output', '.wrangler', '.sites-runtime', '.vinext']);
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const path = resolve(dir, entry.name);
    if (entry.isSymbolicLink()) { failures.push(`심볼릭 링크 검토 필요: ${relative(root,path)}`); continue; }
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}
const files = await walk(root);
const paths = new Set(files.map(p => relative(root, p).replaceAll('\\', '/')));
for (const p of manifest.requiredFiles) if (!paths.has(p)) failures.push(`필수 파일 없음: ${p}`);
for (const mod of manifest.modules) {
  const p = `${mod.path}/README.md`;
  if (!paths.has(p)) failures.push(`모듈 책임 문서 없음: ${p}`);
  else {
    const body = await readFile(resolve(root,p),'utf8');
    for (const label of ['책임', '연결 규칙', '금지', '완료 판단'])
      if (!body.includes(label)) failures.push(`모듈 설명 누락: ${p} / ${label}`);
  }
}

let linkCount = 0;
let codeCount = 0;
for (const path of files) {
  const rel = relative(root,path).replaceAll('\\','/');
  if (/\.db(?:-|$)|\.sqlite3?$/.test(rel)) failures.push(`실제 DB 포함 금지: ${rel}`);
  if (/(^|\/)\.env(?:\.|$)/.test(rel) && !rel.endsWith('.env.example')) failures.push(`비밀 환경 파일 포함: ${rel}`);
  if ((await stat(path)).size === 0) failures.push(`빈 파일: ${rel}`);
  if (!['.md','.json','.ts','.tsx','.mjs','.css','.html'].includes(extname(path))) continue;
  const body = await readFile(path,'utf8');
  if (extname(path)==='.json') {
    try { JSON.parse(body); } catch(e) { failures.push(`JSON 오류: ${rel}: ${e.message}`); }
  }
  if (extname(path)==='.md') {
    for (const match of body.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      let target=match[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      target=decodeURIComponent(target.split('#')[0]);
      const resolved=resolve(dirname(path),target);
      if (relative(root,resolved).startsWith('..') || resolve(resolved) === root) failures.push(`프로젝트 밖 링크: ${rel} → ${target}`);
      else { try { await stat(resolved); linkCount++; } catch { failures.push(`깨진 링크: ${rel} → ${target}`); } }
    }
  }
  if (/\.(tsx?|jsx?|mjs)$/.test(rel)) {
    codeCount++;
    const imports=[...body.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
    if (/^apps\/web\//.test(rel)) {
      for(const imp of imports) if (/(apps\/api|infrastructure\/persistence|@supabase\/supabase-js|better-sqlite3|^pg$)/.test(imp)) failures.push(`브라우저 DB 경계 위반: ${rel} → ${imp}`);
    }
    if (/^apps\/web\/src\/(app\/public|features\/booking-flow)\//.test(rel)) {
      for(const imp of imports) if (/(three|\/scene|contracts.*owner)/i.test(imp)) failures.push(`고객 번들 경계 위반: ${rel} → ${imp}`);
    }
    if (/^packages\/domain\//.test(rel)) {
      for(const imp of imports) if (/(react|supabase|sqlite|fastify|express|node:)/i.test(imp)) failures.push(`domain 의존성 위반: ${rel} → ${imp}`);
    }
  }
}
const pkg = JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if (!pkg.private) failures.push('scaffold는 private workspace여야 합니다.');
const names=new Set();
for(const path of files.filter(p=>p.endsWith('/package.json'))) {
  const item=JSON.parse(await readFile(path,'utf8'));
  if(names.has(item.name)) failures.push(`중복 workspace 이름: ${item.name}`);
  names.add(item.name);
}
console.log(`구조 검사: ${files.length}개 파일 / ${manifest.modules.length}개 책임 모듈 / 내부 링크 ${linkCount}개 / 코드 계약 ${codeCount}개`);
if (failures.length) {
  console.error(failures.map(x=>`FAIL ${x}`).join('\n')); process.exitCode=1;
} else {
  console.log('PASS: 필수 경로·모듈 문서·내부 링크·JSON·초기 import 경계');
  console.log('범위: 구조 검사이며 기능 실행 테스트는 npm test로 별도 수행. 비밀값 탐지 전문 도구를 대체하지 않음.');
}
