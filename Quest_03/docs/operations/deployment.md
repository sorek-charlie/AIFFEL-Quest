# 배포 준비 · 실제 배포 미수행

## 로컬

웹 dev server와 API를 실행하고 API는 127.0.0.1에 바인딩합니다. 개발 프록시로 /api를 API에 연결합니다.
SQLite 파일은 runtime/data에, 환경은 .env에 둡니다. 실제 시작 명령은 코드 구현 뒤 README에 추가합니다.

## Render 선택 경로

1. Node API를 Web Service로 구성하고 production 환경·Supabase 접속·세션 값을 설정합니다.
2. React 빌드 산출물은 정적 호스팅 또는 같은 Node 서비스에서 제공합니다. 같은 origin 배포를 우선합니다.
3. /book/:slug 같은 SPA 경로의 index fallback을 설정합니다. /api는 fallback과 분리합니다.
4. DB migration을 별도 릴리스 단계로 적용하고 health/readiness, TLS, 쿠키, Origin을 확인합니다.
5. 배포 뒤 Todo 재시작 보존, 고객 신청, 승인 경쟁, RLS, 고객 정보 미노출을 확인합니다.

무료 서비스의 휴면·가용성·DB 백업 정책은 배포 시 공식 문서를 확인합니다. ‘무료라 24시간 항상 켜짐’을 가정하지 않습니다.
임시 디스크의 SQLite를 실사용 영구 저장으로 취급하지 않습니다. cloud 단계는 Supabase를 사용합니다.
완료 전에는 render.yaml의 가짜 build/start 명령을 넣지 않습니다. infra/render에 실제 앱 명령이 확정되면 파일을 작성합니다.
