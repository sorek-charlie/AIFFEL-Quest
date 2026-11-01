# 소유자 계정·공개 프로필

경로: `apps/api/src/application/identity`

**책임**: 인증된 ID와 공개 slug 연결.

**연결 규칙**: 공개 프로필을 별도 projection으로 반환.

**금지**: 이메일을 공개 slug로 사용.

**구현 시 배치할 파일**: resolveOwner.ts, updatePublicProfile.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
