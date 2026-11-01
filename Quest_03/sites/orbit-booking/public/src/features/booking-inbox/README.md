# 예약 승인함

경로: `apps/web/src/features/booking-inbox`

**책임**: pending 목록, 요청 상세, 승인·거절·취소.

**연결 규칙**: 승인 API 결과에 따라 상태 갱신. 409이면 새 빈 시간 제안.

**금지**: 버튼 클릭 직후 무조건 확정 표시.

**구현 시 배치할 파일**: BookingInbox.tsx, ApprovalDialog.tsx. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

index.mjs: 승인·거절·취소와 서버 결과 재조회.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
