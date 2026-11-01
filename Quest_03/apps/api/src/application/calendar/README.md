# 일정 유스케이스

경로: `apps/api/src/application/calendar`

**책임**: 일정 생성·이동·수정·취소·시간 점유.

**연결 규칙**: 예약 승인과 동일한 일정 잠금 규칙 사용.

**금지**: 승인과 다른 통로로 충돌 검사 없이 저장.

**구현 시 배치할 파일**: createEvent.ts, rescheduleEvent.ts, cancelEvent.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
