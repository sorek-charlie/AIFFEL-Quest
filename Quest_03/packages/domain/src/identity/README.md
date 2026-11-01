# 식별자·권한 도메인

경로: `packages/domain/src/identity`

**책임**: OwnerId, 공개 프로필과 내부 계정 구분.

**연결 규칙**: 인증된 actor를 명시적 인자로 받음.

**금지**: 공급자 SDK·인증 토큰 파싱.

**구현 시 배치할 파일**: Actor.ts, PublicProfile.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
