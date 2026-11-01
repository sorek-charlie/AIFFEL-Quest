# 서버 조립 지점

경로: `apps/api/src/bootstrap`

**책임**: 설정 검증 → 어댑터 선택 → 유스케이스 → 라우트.

**연결 규칙**: DATABASE_PROVIDER에 따라 한 DB만 선택.

**금지**: 실행 중 두 DB에 조용히 이중 쓰기.

**구현 시 배치할 파일**: createApp.ts, compositionRoot.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

server.mjs: Node HTTP, 실행 키 인증, loopback 서버 조립.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
