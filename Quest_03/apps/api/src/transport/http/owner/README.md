# 인증된 소유자 API

경로: `apps/api/src/transport/http/owner`

**책임**: Todo·일정·예약 승인·공개 규칙 요청을 유스케이스에 전달.

**연결 규칙**: 세션에서 ownerId 추출, DTO 검증, 에러→HTTP 변환.

**금지**: 본문 ownerId 신뢰, 직접 SQL.

**구현 시 배치할 파일**: tasks.routes.ts, calendar.routes.ts, bookings.routes.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
