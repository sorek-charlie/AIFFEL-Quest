# DB 어댑터 공통 계약 검증

경로: `tests/adapter-contract`

**책임**: 같은 입력과 결과를 SQLite·Supabase에서 비교.

**연결 규칙**: 재시작 영속성·동시 승인·owner 분리.

**금지**: 한 DB만 통과하고 전환 완료 판정.

**구현 시 배치할 파일**: persistence.contract.test.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
