# 고객 모바일 예약 흐름

경로: `apps/web/src/features/booking-flow`

**책임**: 날짜 선택 → 슬롯 선택 → 최소 정보 → 승인 대기.

**연결 규칙**: contracts/public만 사용. 선택한 시간대와 날짜를 모든 단계에 표시.

**금지**: 예약 요청을 확정으로 표현, 3D 라이브러리 사용.

**구현 시 배치할 파일**: DateStep.tsx, SlotStep.tsx, DetailsStep.tsx, PendingReceipt.tsx. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

status.mjs: 고객 상태 문구. 고객 흐름 조합은 app/public/index.mjs.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
