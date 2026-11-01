# 공통 보안 경계

경로: `apps/api/src/platform/security`

**책임**: CSRF·Origin·rate limit·입력 길이·보안 헤더.

**연결 규칙**: 공개·소유자 라우트 각각 정책 적용.

**금지**: CORS를 인증 대용으로 취급.

**구현 시 배치할 파일**: csrf.ts, rateLimit.ts, headers.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
