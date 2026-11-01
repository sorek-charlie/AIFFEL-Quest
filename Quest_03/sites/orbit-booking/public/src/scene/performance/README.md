# 3D 품질·대체 보기

경로: `apps/web/src/scene/performance`

**책임**: DPR 제한, 필요할 때 렌더, WebGL 오류·저성능 대응.

**연결 규칙**: WebGL 실패 또는 사용자 선택 시 즉시 2D 제공.

**금지**: 무한 고정 애니메이션·고객 번들에 3D 포함.

**구현 시 배치할 파일**: QualityPolicy.ts, SceneBoundary.tsx. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
