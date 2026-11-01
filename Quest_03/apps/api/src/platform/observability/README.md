# 진단과 감사

경로: `apps/api/src/platform/observability`

**책임**: request ID, 지연시간, 오류 코드, 상태 전환 감사.

**연결 규칙**: 연락처·토큰·요청 본문을 로그에서 제거.

**금지**: 전체 HTTP body·cookie 기록.

**구현 시 배치할 파일**: logger.ts, audit.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
