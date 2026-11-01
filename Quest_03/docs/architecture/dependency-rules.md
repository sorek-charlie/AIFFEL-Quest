# 의존성 규칙

| 호출하는 영역 | 허용 | 금지 |
|---|---|---|
| web/app | 같은 앱 features, platform, scene(owner만) | API 소스·DB SDK |
| web/features | contracts, ui, tokens, platform | 다른 기능 내부 구현 직접 참조 |
| web/public·booking-flow | public 계약, DOM UI | scene, owner DTO, three/R3F |
| web/scene | 캘린더 뷰모델, tokens | 저장·인증·승인 유스케이스 |
| api/transport | application, contracts, security | 직접 SQL·UI |
| api/application | domain, domain/ports | HTTP 응답 객체·구체 DB SDK |
| api/infrastructure | domain/ports, DB/Auth SDK | web |
| api/bootstrap | application, infrastructure, transport | 업무 규칙 직접 구현 |
| domain | 순수 타입·시간 규칙 | React·DB·HTTP·process.env |
| contracts | 직렬화 타입·검증 schema | DB row·서버 비밀값 |

폴더 단위 책임을 바꾸면 이 표와 architecture ADR을 함께 수정합니다.
구조 검사기는 일부 금지 import를 잡는 초기 검사입니다. alias·동적 import까지 완전 검증하는 도구는 아니며 구현 단계에서 bundler 분석과 정적 dependency rule을 추가합니다.
