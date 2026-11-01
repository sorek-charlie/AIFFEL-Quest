# 외부 캘린더 확장 지점

경로: `apps/api/src/infrastructure/calendar-providers`

**책임**: 추후 Google·Outlook 일정 동기화.

**연결 규칙**: 처음에는 disabled, 동의·토큰 암호화·재시도 설계 후 구현.

**금지**: 현재 개인 캘린더를 자동 변경.

**구현 시 배치할 파일**: CalendarProvider.ts, DisabledCalendarProvider.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 0.2 구현 상태

google.mjs와 sync-manager.mjs: Google Desktop OAuth/PKCE, 지정 계정 검증, Gmail 1시간·Google Calendar 1분 확인, 강제 확인 및 TXT/ICS 대체 경로. 실제 계정 연결은 미완료, provider fixture 테스트 통과.
