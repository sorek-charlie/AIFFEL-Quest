# Cloud 검증 기록

고객 신청과 관리자 터미널을 Sites Worker/D1에 실제 배포했습니다.

- 관리자: https://orbit-appointments-quest03.cherrysocute9.chatgpt.site/owner
- 고객: https://orbit-appointments-quest03.cherrysocute9.chatgpt.site/booking
- 최종 v3 / commit `75b5ebce033b427b881d9db0bb8245365a152d92`
- 배포 `appgdep_6ae352e002a8819190649a5d275ab557`: succeeded, 2026-10-29T14:06:46Z.
- 관리자 HTML/CSS/글꼴 HTTP 200. 실제 PC 연결에서 auth/session: configured=true, authenticated=false. 비인증 owner/state: 401.
- 격리 테스트 DB로 실제 HTTPS 로그인/조회/할 일 생성·수정·삭제/로그아웃·세션 무효화 통과. 사용자 데이터/비밀번호 변경 없음.
- 고객 실제 HTTPS 신청 → PC inbox → Confirm → 고객 confirmed → 검증 일정 취소 통과. 활성 테스트 점유를 남기지 않았습니다.
- 14개 테스트 × 100회 = 1,400회 통과. 최종 UI 수정 뒤 전체 14개 추가 통과. 상세는 [관리자 검증](owner-terminal.md).
- 갱신한 Windows EXE의 bundled Node 시작 smoke-test 통과. ZIP에 DB/key/env 비밀 파일 미포함 확인.

일정 원본은 PC SQLite이며 PC 없이 독립 실행하는 클라우드 일정 서비스는 아닙니다. Supabase/RLS 검증을 했다는 의미가 아닙니다. 실제 Android 실기기와 Google 계정 인증은 미완료입니다.
