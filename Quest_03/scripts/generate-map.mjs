import {readFileSync,writeFileSync} from 'node:fs';
const m=JSON.parse(readFileSync('project.manifest.json','utf8'));
const rows=m.modules.map(x=>`- ${x.path}: ${x.responsibility}`).join('\n');
writeFileSync('FOLDER_MAP.md','# 개인 일정 앱 구조\n\n'+rows+'\n');
writeFileSync('PROJECT_MAP.html','<!doctype html><html lang="ko"><meta charset="utf-8"><title>이성진 개인 일정 구조</title><h1>직접 입력 · Google 가져오기</h1><p>브라우저 → 인증 Node API → application/domain → SQLite 또는 Todo Supabase</p><pre>'+rows+'</pre></html>');
