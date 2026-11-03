# 검증 폴더

`npm test`는 Node 내장 테스트 러너로 실제 단위·통합 테스트를 실행합니다. Google 누락 보충 변경 검증은 `docs/quality/google-recovery-tests.json`에 기록했습니다(2026-11-03,42개씩2회 통과).

단위 검사는 정시·앱 시작·다중 누락·실패 재시도·동시 실행·비밀값 제외를, 통합 검사는 실제 저장소·HTTP 인증·충돌·문서 검토·Google 제공자 응답 수집·공개 읽기 전용 경계를 다룹니다. Google 통합 테스트는 가짜 제공자이며 실제 Google 실행 기록은 `docs/quality/google-startup-live.json`으로 구분합니다.

구조 검사는 `node scripts/check-structure.mjs`이며 기능·보안 테스트를 대체하지 않습니다. UI·모바일·키보드와 실제 Supabase 검증은 각각의 기록에서 실행 날짜·범위를 확인하세요. 이전 성공 기록을 최신 재검증으로 표시하지 않습니다.
