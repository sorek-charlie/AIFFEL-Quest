// Public synthetic demonstration data only. Never load a PC DB or Gmail here.
export const viewerData={mode:'read-only',demo:true,updatedAt:'2026-11-03',events:[
{id:'demo-event-1',title:'프로젝트 기획 검토',startsAt:'2026-11-03T09:00:00+09:00',endsAt:'2026-11-03T10:00:00+09:00',location:'온라인',details:'시연용 일정입니다.',projectId:'demo-project-1'},
{id:'demo-event-2',title:'데이터 저장 점검',startsAt:'2026-11-05T14:00:00+09:00',endsAt:'2026-11-05T15:00:00+09:00',location:'온라인',details:'로컬·클라우드 저장 흐름 확인',projectId:'demo-project-1'},
{id:'demo-event-3',title:'다음 단계 계획',startsAt:'2026-11-10T10:00:00+09:00',endsAt:'2026-11-10T11:00:00+09:00',location:'온라인',details:'일정·할 일·프로젝트 연결 시연',projectId:'demo-project-2'}],tasks:[
{id:'demo-task-1',title:'PRD 작성',dueDate:'2026-11-02',completed:true,details:'목표·기능·완료 기준 정리',projectId:'demo-project-1'},
{id:'demo-task-2',title:'로컬 저장 확인',dueDate:'2026-11-03',completed:true,details:'앱을 다시 실행해 자료 확인',projectId:'demo-project-1'},
{id:'demo-task-3',title:'클라우드 저장 확인',dueDate:'2026-11-04',completed:false,details:'Supabase 연결 후 자료 확인',projectId:'demo-project-1'},
{id:'demo-task-4',title:'보안 확인 기록 정리',dueDate:'2026-11-05',completed:false,details:'사용자별 접근 차단 확인',projectId:'demo-project-1'},
{id:'demo-task-5',title:'다음 주 할 일 정리',dueDate:'2026-11-09',completed:false,details:'주간 계획 시연',projectId:'demo-project-2'}],projects:[
{id:'demo-project-1',title:'Todo 앱 만들기 (예시)',startsOn:'2026-11-02',endsOn:'2026-11-05',status:'진행 중',notes:'공개 열람용 시연 프로젝트. 실제 검증 결과는 GitHub 검증 기록에서 확인하세요.'},
{id:'demo-project-2',title:'다음 단계 계획 (예시)',startsOn:'2026-11-09',endsOn:'2026-11-13',status:'계획',notes:'공개 열람용 시연 프로젝트'}]};
