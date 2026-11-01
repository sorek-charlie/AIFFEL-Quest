# 인증 공급자 어댑터

경로: `apps/api/src/infrastructure/auth`

**책임**: 로컬 학습용 사용자와 Supabase Auth 세션 연결.

**연결 규칙**: 로컬 모드는 loopback 전용·운영 환경에서 실행 거부.

**금지**: 학습용 가짜 로그인을 인터넷에 노출.

**구현 시 배치할 파일**: LocalDevIdentity.ts, SupabaseIdentity.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 0.2 구현 상태

password.mjs: 비밀번호 scrypt 해시, 초기 설정, 로그인 실패 제한, 변경. 초기 설정/변경/재시작 테스트 통과.
