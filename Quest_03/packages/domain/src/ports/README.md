# 저장소·원자적 명령 인터페이스

경로: `packages/domain/src/ports`

**책임**: TasksRepository, CalendarRepository, BookingCommands.

**연결 규칙**: 원자적 승인 책임을 어댑터 계약에 명시.

**금지**: 트랜잭션 객체를 브라우저에 노출.

**구현 시 배치할 파일**: TasksRepository.ts, BookingCommands.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

SchedulerRepository.ts 저장 계약을 추가했습니다.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
