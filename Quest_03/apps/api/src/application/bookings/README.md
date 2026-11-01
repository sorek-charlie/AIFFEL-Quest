# 예약 요청과 결정 유스케이스

경로: `apps/api/src/application/bookings`

**책임**: 신청·승인·거절·만료·취소와 멱등성.

**연결 규칙**: 승인은 어댑터의 단일 원자적 명령으로 실행.

**금지**: 조회 후 별도 HTTP 호출 두 번으로 승인 처리.

**구현 시 배치할 파일**: requestBooking.ts, approveBooking.ts, rejectBooking.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
