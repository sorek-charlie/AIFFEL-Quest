# Todo 유스케이스

경로: `apps/api/src/application/tasks`

**책임**: 소유자별 CRUD·완료·지속 저장.

**연결 규칙**: domain/ports 저장 인터페이스와 인증 주체 사용.

**금지**: HTTP 객체나 React에 의존.

**구현 시 배치할 파일**: createTask.ts, updateTask.ts, deleteTask.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 과제 D-4 · 2026-11-01

todo.mjs: 비동기 Todo 포트를 사용하는 제목·완료·버전 검증 유스케이스를 구현했습니다.
