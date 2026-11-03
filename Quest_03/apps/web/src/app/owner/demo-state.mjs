import {today} from '../../platform/api/index.mjs';
export function demoState(date=today()){
 const shift=n=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10),projectId='demo-project';
 return {_demo:true,settings:{displayName:'이성진 예시'},projects:[{id:projectId,title:'고객 포털 리뉴얼',startsOn:shift(-7),endsOn:shift(14),status:'active',progress:65,notes:'고객 피드백 1차 반영 완료 · 금요일 중간 시연 예정. 디자인 승인 후 개발 일정을 확정합니다.'}],events:[
 {id:'demo-yesterday',title:'서비스 기획 검토',startsAt:shift(-1)+'T01:00:00Z',endsAt:shift(-1)+'T02:00:00Z',projectId},
 {id:'demo-today',title:'고객 포털 개선 미팅',startsAt:date+'T01:00:00Z',endsAt:date+'T02:00:00Z',details:'메인 화면 시안과 입력 흐름을 검토하고 배포 일정을 확정합니다.',participants:'김민수 PM · 이서연 디자이너 · 박지훈 개발자',location:'본사 3층 회의실 A / Zoom 병행',projectId},
 {id:'demo-tomorrow',title:'개발 일정 협의',startsAt:shift(1)+'T05:00:00Z',endsAt:shift(1)+'T06:00:00Z',projectId}],tasks:[
 {id:'demo-task-yesterday',title:'고객 요구사항 정리',dueDate:shift(-1),completed:true,projectId},
 {id:'demo-task-1',title:'화면 시안 최종 확인',dueDate:date,completed:true,projectId},
 {id:'demo-task-2',title:'회의 결과와 수정 범위 공유',dueDate:date,completed:false,projectId},
 {id:'demo-task-3',title:'다음 배포 체크리스트 작성',dueDate:date,completed:false,projectId},
 {id:'demo-task-tomorrow',title:'개발 일정표 전달',dueDate:shift(1),completed:false,projectId}]};
}
