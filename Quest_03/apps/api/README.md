# API 앱

transport/http는 요청을 해석하고 application에 전달합니다. application은 domain/ports로 저장을 요청하며 bootstrap이 구체 어댑터를 주입합니다.
platform에는 환경·로그·보안처럼 기능 공통 사항만 둡니다. 예약 규칙을 generic utils로 흩뜨리지 않습니다.

현재 로컬 Node HTTP 서버·SQLite·실행 키 인증·Todo·일정·예약 신청/승인/취소를 구현했습니다.
`src/bootstrap/server.mjs`가 저장소와 application을 조립합니다. `npm start`로 실행합니다.
`src/application/scheduler.mjs`가 유스케이스를 제공하며 SQLite 어댑터만 DB SDK를 사용합니다.
공개 응답은 명시적 필드로 반환합니다. 동시 승인과 두 사용자 권한은 통합 테스트에서 검증합니다.
비밀번호 인증, 입력 검토함, 문서/이미지 추출, Google 읽기 전용 OAuth 및 주기 확인 어댑터를 추가했습니다.
실제 Google 인증은 아직 하지 않았으며 공급자 응답은 가상 fixture로 검증했습니다. Supabase와 외부 문자/메일 발송은 미구현입니다.
