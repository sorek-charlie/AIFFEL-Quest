# 공통 오류 계약

경로: `packages/contracts/src/errors`

**책임**: code·사용자 메시지·request ID.

**연결 규칙**: SLOT_CONFLICT, UNAUTHORIZED 등 안정적 코드.

**금지**: SQL·스택·비밀값을 사용자 오류에 포함.

**구현 시 배치할 파일**: errors.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
