# 고객용 공유 URL 진입점

경로: `apps/web/src/app/public`

**책임**: /book/:slug → 날짜·시간 → 신청 → 상태 확인.

**연결 규칙**: booking-flow와 공용 UI만 사용. 고객에게 로그인 강요하지 않음.

**금지**: owner/scene import, 주최자의 개인 일정 제목 노출.

**구현 시 배치할 파일**: BookingRoutes.tsx, PublicLayout.tsx. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

index.mjs: 고객 날짜·시간 선택, 신청과 상태 확인.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
