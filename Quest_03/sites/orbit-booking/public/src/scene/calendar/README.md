# 3D 주간 일정 장면

경로: `apps/web/src/scene/calendar`

**책임**: X=요일, Y=시간, Z=업무 분류 레이어.

**연결 규칙**: 2D와 동일한 뷰모델 사용, ID로 선택 이벤트 전달.

**금지**: 예약 확정·DB 저장·권한 판단.

**구현 시 배치할 파일**: CalendarScene.tsx, DayColumn.tsx, EventBlock.tsx. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

index.mjs: 같은 DOM의 CSS 원근 표현과 2D 복귀. WebGL은 미구현.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
