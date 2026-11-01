# 3D 조작·접근성 연결

경로: `apps/web/src/scene/interaction`

**책임**: 선택·확대·키보드 포커스·DOM 상세 패널 연결.

**연결 규칙**: 캔버스 조작과 DOM 폼 역할을 분리.

**금지**: 드래그만 제공하거나 색상만으로 상태 표시.

**구현 시 배치할 파일**: SceneControls.tsx, SelectionBridge.tsx. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
