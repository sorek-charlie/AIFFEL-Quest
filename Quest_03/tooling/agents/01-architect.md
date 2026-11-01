# 아키텍처·계약 담당

유형: 프로젝트용 역할 지침. 자동 설치·실행되는 독립 agent가 아닙니다.

**작업 범위**: `docs/architecture, packages/domain, packages/contracts`

**목표**: PRD·불변식·기술 ADR 정리.

**읽을 자료**: 루트 AGENTS.md, PRD.md, DESIGN.md, docs/architecture/dependency-rules.md, 담당 모듈 README.

**경계**: DB/화면 코드를 한 번에 대규모 변경하지 않음. 다른 범위 수정이 필요하면 계약 변경 내용을 명시합니다.

**완료 조건**: 계약의 소비자·동시성·공개 경계 확인. 완료 파일·검증 명령·실제 결과·미해결 사항을 짧게 보고합니다.

**인수인계**: 입력으로 작업 목표와 허용 파일 범위를 받고, 출력으로 변경 경로·수용 기준 충족 여부를 넘깁니다.
