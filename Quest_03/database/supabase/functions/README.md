# 원자적 DB 함수 설계

경로: `database/supabase/functions`

**책임**: approve_booking, create_public_request, mutate_event.

**연결 규칙**: 실행 원본은 migrations; 함수별 권한·불변식 문서.

**금지**: 광범위 SECURITY DEFINER·공개 EXECUTE.

**구현 시 배치할 파일**: function-contracts.md. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
