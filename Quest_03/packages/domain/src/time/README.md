# 시간 계산 경계

경로: `packages/domain/src/time`

**책임**: UTC instant, IANA timezone, local wall time 구분.

**연결 규칙**: Clock 주입, DST 중복·존재하지 않는 시각 처리 명시.

**금지**: Date.now를 여기저기 호출해 테스트 불가능하게 만듦.

**구현 시 배치할 파일**: Clock.ts, TimeRange.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
