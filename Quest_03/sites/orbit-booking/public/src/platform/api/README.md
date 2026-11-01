# 브라우저 API 클라이언트

경로: `apps/web/src/platform/api`

**책임**: /api 요청·취소·오류 정규화.

**연결 규칙**: DTO만 받고 세션은 정해진 전송 정책 사용.

**금지**: DB URL·관리자 키·SQL 포함.

**구현 시 배치할 파일**: httpClient.ts, apiErrors.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

index.mjs: fetch API·오류 안내·출력 이스케이프.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
