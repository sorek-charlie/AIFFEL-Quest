# 예약 상태 도메인

경로: `packages/domain/src/bookings`

**책임**: pending·confirmed·rejected·cancelled·expired.

**연결 규칙**: 상태 전이와 충돌 규칙의 단일 정의.

**금지**: 클라이언트 입력 status를 직접 저장.

**구현 시 배치할 파일**: BookingRequest.ts, transitions.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
