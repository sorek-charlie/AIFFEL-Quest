# 재사용 3D 표현

경로: `apps/web/src/scene/primitives`

**책임**: 일정 블록, 그리드, 선택 윤곽, 조명.

**연결 규칙**: geometry/material 공유와 적절한 dispose.

**금지**: 한 일정마다 불필요한 고해상도 외부 모델.

**구현 시 배치할 파일**: TimeGrid.tsx, SelectionOutline.tsx. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.
