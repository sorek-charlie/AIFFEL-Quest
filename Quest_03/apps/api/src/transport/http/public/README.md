# 공개 예약 API

경로: `apps/api/src/transport/http/public`

**책임**: 공유 정보·빈 슬롯·예약 신청·제한된 상태 조회.

**연결 규칙**: rate limit, 공개 DTO 허용 목록, capability 검증.

**금지**: 개인 일정·전체 요청 목록·연락처 반환.

**구현 시 배치할 파일**: availability.routes.ts, bookingRequests.routes.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
