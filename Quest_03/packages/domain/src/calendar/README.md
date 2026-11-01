# 일정 도메인

경로: `packages/domain/src/calendar`

**책임**: 시간 구간·업무 분류·시간 점유 규칙.

**연결 규칙**: [start,end) 반개구간; Task와 Event 분리.

**금지**: 시간 문자열을 로컬 브라우저 환경으로 임의 해석.

**구현 시 배치할 파일**: CalendarEvent.ts, interval.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

규칙 공개 진입점은 ../index.mjs의 interval/overlaps입니다.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
