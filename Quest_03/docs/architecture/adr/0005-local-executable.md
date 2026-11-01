# 0005 · 의존성 없는 로컬 실행판

날짜: 2026-10-29. Windows EXE 요청에 대응한 로컬 구현 결정입니다.

기존 폴더 책임은 유지하되 React/Vite/Fastify/R3F는 아직 도입하지 않습니다.
화면은 브라우저 ES modules와 CSS, 서버는 Node 24.22.1의 HTTP와 SQLite 내장 모듈을 사용합니다.
선택 이유는 별도 설치 없는 로컬 실행과 의존성 최소화입니다. Node SQLite는 해당 런타임에서 실험 기능 경고가 있을 수 있습니다.
정확한 실행 버전은 배포 폴더 runtime/node.exe에 고정되며 Node 라이선스·제3자 고지를 동봉합니다.
외부 npm 패키지를 추가하지 않았으며 package-lock.json은 workspace와 엔진 요구를 기록합니다.

bootstrap이 SQLite 저장소를 application에 주입합니다. application은 구체 어댑터를 import하지 않습니다.
domain은 HTTP·DB·환경변수·UI를 import하지 않습니다. 브라우저는 API만 사용합니다.
승인·일정 변경·설정 변경은 SQLite BEGIN IMMEDIATE로 직렬화합니다. 승인과 event 생성·감사 기록은 하나의 커밋입니다.
멱등성 키는 UUID를 사용하며 요청별 capability는 해시로 저장하고 재전송 응답만 AES-GCM 암호화합니다.
암호화 키와 DB를 함께 보관하므로 OS 계정 접근 권한을 대체하는 암호화는 아닙니다.

소유자 인증은 실행마다 새로 발급한 무작위 실행 키 + 서버 메모리의 12시간 세션입니다.
외부 bind 설정은 제공하지 않으며 127.0.0.1에만 listen합니다. production 환경에서는 실행을 거부합니다.
두 사용자 격리는 저장소 및 두 API 인스턴스로 검증했습니다. UI의 다중 계정 로그인은 제공하지 않습니다.
Supabase 경로 및 RLS는 실제 연결 전까지 미구현입니다.

Windows WinForms 실행기가 숨겨진 Node 자식을 시작하고 준비 신호를 받은 후 기본 브라우저를 엽니다.
실행 창을 닫으면 자식을 종료합니다. 정식 설치기·코드 서명·단일 파일 번들은 제공하지 않습니다.
배포 폴더 전체를 이동해야 합니다. 사용 데이터는 소스와 분리하여 LocalAppData에 저장합니다.

공간 보기는 CSS perspective로 같은 DOM의 일정 표현만 변경합니다. WebGL 3D 구현은 별도 후속 범위입니다.
시간대는 Asia/Seoul만 지원합니다. 임의 IANA/DST 시간대·날짜 예외는 아직 지원하지 않습니다.
오래된 멱등성 기록 자동 정리와 백업 UI, 외부 공급자 알림은 후속 범위입니다.

공식 API 참고: [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html), [Node HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html).
