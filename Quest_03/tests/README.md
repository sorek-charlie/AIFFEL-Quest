# 검증 폴더

현재 실제 앱 테스트는 없습니다. 각 하위 폴더에 검증 대상과 예정 위치를 지정했습니다.
구조 검사는 scripts/check-structure.mjs이며 기능·보안 테스트를 대체하지 않습니다.

추후 단위 테스트는 시간·상태 규칙, adapter-contract는 두 DB의 동일 동작, integration은 원자성·경쟁·HTTP, e2e는 사용자 여정을 담당합니다.
테스트 ID와 과제 증거 연결은 docs/quality/test-matrix.md를 기준으로 합니다.
