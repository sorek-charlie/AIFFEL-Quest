# 외부 관리자 실제 검증

2026-10-29 KST 작업. Sites Worker/D1 v2에 관리자 중계를 배포한 뒤 실제 HTTPS 주소로 검증했다.

- `/owner` 관리자 화면, `/booking` 고객 화면 경로 분리.
- 실제 배포 주소에서 격리된 임시 PC DB의 테스트 비밀번호로 로그인 → Secure/HttpOnly 쿠키 → 상태 조회 → 할 일 생성/PATCH/DELETE → 로그아웃 → 기존 쿠키 401 확인. 사용자 비밀번호와 일정은 변경하지 않았다.
- 관리자 대기열 암호화, AAD 방향 불일치 거부, 인증 없는 bridge 401, 개인 데이터 요청 401, 다른 Origin 403, queued 원자 claim, 중복 실행 방지를 실제 D1 호환 SQLite 테스트로 확인했다.
- 14개 전체 테스트 100회: 100회 통과, 1,400개 실행. 기록: `evidence/local/owner-terminal-tests-100.json`. 이전 실패에서 서버 재시작 테스트의 pooled fetch를 새 TCP 요청으로 바꾼 뒤 재실행했다. 별도로 제한된 샌드박스에서 EACCES가 발생한 실행은 통과로 세지 않았다.
- 1440×900 대시보드 페이지 높이 900, 가로 1440. 390×844 모바일에서 가로 넘침 없음. Pretendard 로딩 확인, 모바일 nav 23px/label 24px 확인. Escape로 브리핑 닫기, 키보드 Space로 공간 보기/2D 복귀 확인. 스크린샷은 `evidence/local/owner-terminal-desktop.jpg`, `owner-terminal-mobile.jpg`.
- 본문/버튼 23~28px, 달력 날짜 24px, 밝은 배경, 자체 제공 Pretendard 1.3.9/OFL 포함. UI 수정 후 전체 14개 테스트 추가 통과.

실제 Android 실기기, Google 실계정 인증, PC가 꺼진 상태의 독립 일정 서비스는 검증/구현하지 않았다. 실제 사용자 비밀번호를 모르므로 최종 사용자 계정 로그인은 사용자가 수행한다. 임시 DB를 통한 실제 서비스 인증/저장 경로 검증과 구분한다.
