# 폴더 지도 · ORBIT Scheduler

실제 파일 기준 자동 생성. 124개 폴더 / 225개 파일 / 71개 책임 모듈.

## 계층을 나눈 기준

화면(개인/고객) → HTTP → 유스케이스 → 도메인 → 저장 인터페이스 → DB 어댑터로 나눕니다.
3D는 개인 화면의 표현 계층이며 예약 정책·DB 저장을 포함하지 않습니다.
모듈 README에는 책임·허용 연결·금지·예정 파일·완료 조건이 있습니다. 빈 폴더를 늘리는 대신 구현 위치와 검증 방법을 정했습니다.

## 실제 트리

- **apps/**
  - **android/**
    - **src/**
      - **com/**
        - **orbit/**
          - **scheduler/**
            - [KakaoNotifications.java](apps/android/src/com/orbit/scheduler/KakaoNotifications.java)
            - [LocalStore.java](apps/android/src/com/orbit/scheduler/LocalStore.java)
            - [MainActivity.java](apps/android/src/com/orbit/scheduler/MainActivity.java)
    - [AndroidManifest.xml](apps/android/AndroidManifest.xml)
    - [README.md](apps/android/README.md)
    - [toolchain.json](apps/android/toolchain.json)
  - **api/**
    - **src/**
      - **application/**
        - **availability/**
          - [README.md](apps/api/src/application/availability/README.md)
        - **bookings/**
          - [README.md](apps/api/src/application/bookings/README.md)
        - **calendar/**
          - [README.md](apps/api/src/application/calendar/README.md)
        - **identity/**
          - [README.md](apps/api/src/application/identity/README.md)
        - **tasks/**
          - [README.md](apps/api/src/application/tasks/README.md)
        - [inputs.mjs](apps/api/src/application/inputs.mjs)
        - [scheduler.mjs](apps/api/src/application/scheduler.mjs)
      - **bootstrap/**
        - [README.md](apps/api/src/bootstrap/README.md)
        - [server.mjs](apps/api/src/bootstrap/server.mjs)
      - **infrastructure/**
        - **auth/**
          - [password.mjs](apps/api/src/infrastructure/auth/password.mjs)
          - [README.md](apps/api/src/infrastructure/auth/README.md)
        - **calendar-providers/**
          - [google.mjs](apps/api/src/infrastructure/calendar-providers/google.mjs)
          - [README.md](apps/api/src/infrastructure/calendar-providers/README.md)
          - [sync-manager.mjs](apps/api/src/infrastructure/calendar-providers/sync-manager.mjs)
        - **notifications/**
          - [extract-image.ps1](apps/api/src/infrastructure/notifications/extract-image.ps1)
          - [README.md](apps/api/src/infrastructure/notifications/README.md)
          - [uploads.mjs](apps/api/src/infrastructure/notifications/uploads.mjs)
        - **persistence/**
          - **sqlite/**
            - [index.mjs](apps/api/src/infrastructure/persistence/sqlite/index.mjs)
            - [README.md](apps/api/src/infrastructure/persistence/sqlite/README.md)
          - **supabase/**
            - [README.md](apps/api/src/infrastructure/persistence/supabase/README.md)
      - **platform/**
        - **config/**
          - [README.md](apps/api/src/platform/config/README.md)
        - **observability/**
          - [README.md](apps/api/src/platform/observability/README.md)
        - **security/**
          - [README.md](apps/api/src/platform/security/README.md)
      - **transport/**
        - **http/**
          - **auth/**
            - [README.md](apps/api/src/transport/http/auth/README.md)
          - **owner/**
            - [README.md](apps/api/src/transport/http/owner/README.md)
          - **public/**
            - [README.md](apps/api/src/transport/http/public/README.md)
    - [AGENTS.md](apps/api/AGENTS.md)
    - [package.json](apps/api/package.json)
    - [README.md](apps/api/README.md)
  - **web/**
    - **src/**
      - **app/**
        - **auth/**
          - [index.mjs](apps/web/src/app/auth/index.mjs)
          - [README.md](apps/web/src/app/auth/README.md)
        - **owner/**
          - [daily-model.mjs](apps/web/src/app/owner/daily-model.mjs)
          - [daily.mjs](apps/web/src/app/owner/daily.mjs)
          - [dashboard.mjs](apps/web/src/app/owner/dashboard.mjs)
          - [hero.mjs](apps/web/src/app/owner/hero.mjs)
          - [index.mjs](apps/web/src/app/owner/index.mjs)
          - [README.md](apps/web/src/app/owner/README.md)
        - **public/**
          - [index.mjs](apps/web/src/app/public/index.mjs)
          - [README.md](apps/web/src/app/public/README.md)
        - [main.mjs](apps/web/src/app/main.mjs)
      - **features/**
        - **availability-settings/**
          - [README.md](apps/web/src/features/availability-settings/README.md)
        - **booking-flow/**
          - [README.md](apps/web/src/features/booking-flow/README.md)
          - [status.mjs](apps/web/src/features/booking-flow/status.mjs)
        - **booking-inbox/**
          - [index.mjs](apps/web/src/features/booking-inbox/index.mjs)
          - [README.md](apps/web/src/features/booking-inbox/README.md)
        - **calendar/**
          - [index.mjs](apps/web/src/features/calendar/index.mjs)
          - [month-model.mjs](apps/web/src/features/calendar/month-model.mjs)
          - [README.md](apps/web/src/features/calendar/README.md)
        - **settings/**
          - [entry.mjs](apps/web/src/features/settings/entry.mjs)
          - [index.mjs](apps/web/src/features/settings/index.mjs)
          - [inputs.mjs](apps/web/src/features/settings/inputs.mjs)
          - [README.md](apps/web/src/features/settings/README.md)
        - **tasks/**
          - [index.mjs](apps/web/src/features/tasks/index.mjs)
          - [README.md](apps/web/src/features/tasks/README.md)
      - **platform/**
        - **api/**
          - [index.mjs](apps/web/src/platform/api/index.mjs)
          - [README.md](apps/web/src/platform/api/README.md)
        - **query/**
          - [README.md](apps/web/src/platform/query/README.md)
        - **session/**
          - [README.md](apps/web/src/platform/session/README.md)
      - **scene/**
        - **calendar/**
          - [index.mjs](apps/web/src/scene/calendar/index.mjs)
          - [README.md](apps/web/src/scene/calendar/README.md)
        - **interaction/**
          - [README.md](apps/web/src/scene/interaction/README.md)
        - **performance/**
          - [README.md](apps/web/src/scene/performance/README.md)
        - **primitives/**
          - [README.md](apps/web/src/scene/primitives/README.md)
      - [owner-theme.css](apps/web/src/owner-theme.css)
      - [styles.css](apps/web/src/styles.css)
    - [AGENTS.md](apps/web/AGENTS.md)
    - [index.html](apps/web/index.html)
    - [package.json](apps/web/package.json)
    - [README.md](apps/web/README.md)
- **assets/**
  - **fonts/**
    - [README.md](assets/fonts/README.md)
  - **icons/**
    - [README.md](assets/icons/README.md)
  - **models/**
    - [LICENSES.csv](assets/models/LICENSES.csv)
    - [README.md](assets/models/README.md)
- **database/**
  - **seeds/**
    - [README.md](database/seeds/README.md)
    - [scenarios.json](database/seeds/scenarios.json)
  - **sqlite/**
    - **migrations/**
      - [0001_initial.sql](database/sqlite/migrations/0001_initial.sql)
      - [0002_auth_and_inputs.sql](database/sqlite/migrations/0002_auth_and_inputs.sql)
      - [0003_projects.sql](database/sqlite/migrations/0003_projects.sql)
      - [README.md](database/sqlite/migrations/README.md)
  - **supabase/**
    - **functions/**
      - [function-contracts.md](database/supabase/functions/function-contracts.md)
      - [README.md](database/supabase/functions/README.md)
    - **migrations/**
      - [README.md](database/supabase/migrations/README.md)
    - **policies/**
      - [README.md](database/supabase/policies/README.md)
  - [AGENTS.md](database/AGENTS.md)
  - [README.md](database/README.md)
- **docs/**
  - **api/**
    - [endpoints.md](docs/api/endpoints.md)
  - **architecture/**
    - **adr/**
      - [0001-modular-monolith.md](docs/architecture/adr/0001-modular-monolith.md)
      - [0002-storage-and-auth.md](docs/architecture/adr/0002-storage-and-auth.md)
      - [0003-request-before-confirm.md](docs/architecture/adr/0003-request-before-confirm.md)
      - [0004-3d-boundary.md](docs/architecture/adr/0004-3d-boundary.md)
      - [0005-local-executable.md](docs/architecture/adr/0005-local-executable.md)
      - [0006-input-bridge.md](docs/architecture/adr/0006-input-bridge.md)
      - [0007-projects-and-daily.md](docs/architecture/adr/0007-projects-and-daily.md)
    - [dependency-rules.md](docs/architecture/dependency-rules.md)
    - [system.md](docs/architecture/system.md)
    - [time-model.md](docs/architecture/time-model.md)
  - **assignment/**
    - [submission.md](docs/assignment/submission.md)
    - [traceability.md](docs/assignment/traceability.md)
  - **data/**
    - [persistence-switch.md](docs/data/persistence-switch.md)
    - [schema.md](docs/data/schema.md)
  - **operations/**
    - [backup-restore.md](docs/operations/backup-restore.md)
    - [deployment.md](docs/operations/deployment.md)
    - [environment.md](docs/operations/environment.md)
  - **product/**
    - [availability-policy.md](docs/product/availability-policy.md)
    - [booking-lifecycle.md](docs/product/booking-lifecycle.md)
    - [user-flows.md](docs/product/user-flows.md)
  - **quality/**
    - [performance-budget.md](docs/quality/performance-budget.md)
    - [scaffold-check.md](docs/quality/scaffold-check.md)
    - [test-matrix.md](docs/quality/test-matrix.md)
  - **security/**
    - [access-control.md](docs/security/access-control.md)
    - [threat-model.md](docs/security/threat-model.md)
  - **sources/**
    - [references.md](docs/sources/references.md)
  - [README.md](docs/README.md)
- **evidence/**
  - **cloud/**
    - [README.md](evidence/cloud/README.md)
    - [verification.md](evidence/cloud/verification.md)
  - **demo/**
    - [README.md](evidence/demo/README.md)
    - [storyboard.md](evidence/demo/storyboard.md)
  - **local/**
    - [colorful-desktop.png](evidence/local/colorful-desktop.png)
    - [colorful-mobile.png](evidence/local/colorful-mobile.png)
    - [daily-login-popup-mobile.jpg](evidence/local/daily-login-popup-mobile.jpg)
    - [daily-login-popup.jpg](evidence/local/daily-login-popup.jpg)
    - [desktop.png](evidence/local/desktop.png)
    - [final-calendar-mobile.jpg](evidence/local/final-calendar-mobile.jpg)
    - [final-dashboard.jpg](evidence/local/final-dashboard.jpg)
    - [final-password-login.jpg](evidence/local/final-password-login.jpg)
    - [light-calendar-desktop.png](evidence/local/light-calendar-desktop.png)
    - [light-dashboard-desktop.png](evidence/local/light-dashboard-desktop.png)
    - [README.md](evidence/local/README.md)
    - [repeat-tests-100.json](evidence/local/repeat-tests-100.json)
    - [repeat-tests-100.md](evidence/local/repeat-tests-100.md)
    - [repeat-tests-before-fix.json](evidence/local/repeat-tests-before-fix.json)
    - [verification.md](evidence/local/verification.md)
  - **security/**
    - [README.md](evidence/security/README.md)
    - [verification.md](evidence/security/verification.md)
- **infra/**
  - **local/**
    - [사용방법.txt](infra/local/사용방법.txt)
    - [Launcher.cs](infra/local/Launcher.cs)
    - [NODE-LICENSE.txt](infra/local/NODE-LICENSE.txt)
    - [README.md](infra/local/README.md)
    - [SETUP.txt](infra/local/SETUP.txt)
  - **render/**
    - [README.md](infra/render/README.md)
- **packages/**
  - **contracts/**
    - **src/**
      - **errors/**
        - [errors.ts](packages/contracts/src/errors/errors.ts)
        - [README.md](packages/contracts/src/errors/README.md)
      - **owner/**
        - [owner.dto.ts](packages/contracts/src/owner/owner.dto.ts)
        - [README.md](packages/contracts/src/owner/README.md)
      - **public/**
        - [public.dto.ts](packages/contracts/src/public/public.dto.ts)
        - [README.md](packages/contracts/src/public/README.md)
    - [package.json](packages/contracts/package.json)
    - [README.md](packages/contracts/README.md)
  - **design-tokens/**
    - **src/**
      - [README.md](packages/design-tokens/src/README.md)
      - [tokens.json](packages/design-tokens/src/tokens.json)
    - [package.json](packages/design-tokens/package.json)
  - **domain/**
    - **src/**
      - **availability/**
        - [README.md](packages/domain/src/availability/README.md)
      - **bookings/**
        - [lifecycle.json](packages/domain/src/bookings/lifecycle.json)
        - [README.md](packages/domain/src/bookings/README.md)
      - **calendar/**
        - [README.md](packages/domain/src/calendar/README.md)
      - **identity/**
        - [README.md](packages/domain/src/identity/README.md)
      - **ports/**
        - [README.md](packages/domain/src/ports/README.md)
        - [SchedulerRepository.ts](packages/domain/src/ports/SchedulerRepository.ts)
      - **tasks/**
        - [classification.mjs](packages/domain/src/tasks/classification.mjs)
        - [extraction.mjs](packages/domain/src/tasks/extraction.mjs)
        - [README.md](packages/domain/src/tasks/README.md)
      - **time/**
        - [README.md](packages/domain/src/time/README.md)
      - [index.mjs](packages/domain/src/index.mjs)
    - [package.json](packages/domain/package.json)
    - [README.md](packages/domain/README.md)
  - **ui/**
    - **src/**
      - **feedback/**
        - [README.md](packages/ui/src/feedback/README.md)
      - **forms/**
        - [README.md](packages/ui/src/forms/README.md)
      - **primitives/**
        - [README.md](packages/ui/src/primitives/README.md)
    - [package.json](packages/ui/package.json)
- **runtime/**
  - **backups/**
    - [README.md](runtime/backups/README.md)
  - **data/**
    - [README.md](runtime/data/README.md)
- **scripts/**
  - [build-android.ps1](scripts/build-android.ps1)
  - [build-windows.ps1](scripts/build-windows.ps1)
  - [check-structure.mjs](scripts/check-structure.mjs)
  - [generate-map.mjs](scripts/generate-map.mjs)
  - [repeat-tests.mjs](scripts/repeat-tests.mjs)
- **tests/**
  - **accessibility/**
    - [README.md](tests/accessibility/README.md)
  - **adapter-contract/**
    - [README.md](tests/adapter-contract/README.md)
  - **e2e/**
    - [README.md](tests/e2e/README.md)
  - **fixtures/**
    - [README.md](tests/fixtures/README.md)
  - **integration/**
    - [google.test.mjs](tests/integration/google.test.mjs)
    - [inputs-auth.test.mjs](tests/integration/inputs-auth.test.mjs)
    - [projects.test.mjs](tests/integration/projects.test.mjs)
    - [README.md](tests/integration/README.md)
    - [scheduler.test.mjs](tests/integration/scheduler.test.mjs)
  - **performance/**
    - [README.md](tests/performance/README.md)
  - **security/**
    - [README.md](tests/security/README.md)
  - **unit/**
    - [daily.test.mjs](tests/unit/daily.test.mjs)
    - [month-model.test.mjs](tests/unit/month-model.test.mjs)
    - [README.md](tests/unit/README.md)
  - [README.md](tests/README.md)
- **tooling/**
  - **agents/**
    - [01-architect.md](tooling/agents/01-architect.md)
    - [02-scene-engineer.md](tooling/agents/02-scene-engineer.md)
    - [03-guest-experience.md](tooling/agents/03-guest-experience.md)
    - [04-booking-backend.md](tooling/agents/04-booking-backend.md)
    - [05-quality-reviewer.md](tooling/agents/05-quality-reviewer.md)
    - [README.md](tooling/agents/README.md)
  - **hooks/**
    - [pre-commit](tooling/hooks/pre-commit)
    - [README.md](tooling/hooks/README.md)
  - **mcp/**
    - [README.md](tooling/mcp/README.md)
  - **skills/**
    - [README.md](tooling/skills/README.md)
  - [README.md](tooling/README.md)
- [.editorconfig](.editorconfig)
- [.env.example](.env.example)
- [.gitignore](.gitignore)
- [AGENTS.md](AGENTS.md)
- [DESIGN.md](DESIGN.md)
- [FOLDER_MAP.md](FOLDER_MAP.md)
- [ORBIT-Android.apk](ORBIT-Android.apk)
- [ORBIT-Android.apk.idsig](ORBIT-Android.apk.idsig)
- [orbit-scheduler-scaffold.zip](orbit-scheduler-scaffold.zip)
- [ORBIT-Scheduler.exe](ORBIT-Scheduler.exe)
- [package-lock.json](package-lock.json)
- [package.json](package.json)
- [PRD.md](PRD.md)
- [PROJECT_MAP.html](PROJECT_MAP.html)
- [project.manifest.json](project.manifest.json)
- [README.md](README.md)
- [ROADMAP.md](ROADMAP.md)

## 책임 모듈 찾기

| 경로 | 담당 | 책임 |
|---|---|---|
| `apps/web/src/app/owner` | 개인 일정 화면 진입점 | 주·일 보기, Todo, 승인함, 설정 라우트와 인증 경계 |
| `apps/web/src/app/public` | 고객용 공유 URL 진입점 | /book/:slug → 날짜·시간 → 신청 → 상태 확인 |
| `apps/web/src/app/auth` | 로그인·인증 복귀 경로 | 소유자 로그인·로그아웃·세션 만료 안내 |
| `apps/web/src/features/tasks` | 할 일 CRUD | 할 일 추가·조회·수정·완료·삭제와 필터 |
| `apps/web/src/features/calendar` | 2D 일정과 상세 편집 | 같은 일정 데이터를 2D·3D 뷰모델로 제공 |
| `apps/web/src/features/booking-inbox` | 예약 승인함 | pending 목록, 요청 상세, 승인·거절·취소 |
| `apps/web/src/features/availability-settings` | 공개 가능 시간 설정 | 요일별 근무시간·휴무·미팅 길이·준비시간 |
| `apps/web/src/features/booking-flow` | 고객 모바일 예약 흐름 | 날짜 선택 → 슬롯 선택 → 최소 정보 → 승인 대기 |
| `apps/web/src/features/settings` | 소유자 프로필·환경설정 | 시간대·공유 링크·2D/3D 보기·알림 환경설정 |
| `apps/web/src/scene/calendar` | 3D 주간 일정 장면 | X=요일, Y=시간, Z=업무 분류 레이어 |
| `apps/web/src/scene/primitives` | 재사용 3D 표현 | 일정 블록, 그리드, 선택 윤곽, 조명 |
| `apps/web/src/scene/interaction` | 3D 조작·접근성 연결 | 선택·확대·키보드 포커스·DOM 상세 패널 연결 |
| `apps/web/src/scene/performance` | 3D 품질·대체 보기 | DPR 제한, 필요할 때 렌더, WebGL 오류·저성능 대응 |
| `apps/web/src/platform/api` | 브라우저 API 클라이언트 | /api 요청·취소·오류 정규화 |
| `apps/web/src/platform/session` | 브라우저 세션 표시 | 인증 상태, 갱신 실패, 재로그인 흐름 |
| `apps/web/src/platform/query` | 서버 데이터 캐시 | 쿼리 키, 재조회, 승인 뒤 일정·슬롯 무효화 |
| `apps/api/src/bootstrap` | 서버 조립 지점 | 설정 검증 → 어댑터 선택 → 유스케이스 → 라우트 |
| `apps/api/src/transport/http/owner` | 인증된 소유자 API | Todo·일정·예약 승인·공개 규칙 요청을 유스케이스에 전달 |
| `apps/api/src/transport/http/public` | 공개 예약 API | 공유 정보·빈 슬롯·예약 신청·제한된 상태 조회 |
| `apps/api/src/transport/http/auth` | 인증 API | 로그인·콜백·로그아웃·세션 조회 |
| `apps/api/src/application/tasks` | Todo 유스케이스 | 소유자별 CRUD·완료·지속 저장 |
| `apps/api/src/application/calendar` | 일정 유스케이스 | 일정 생성·이동·수정·취소·시간 점유 |
| `apps/api/src/application/availability` | 빈 시간 계산 유스케이스 | 공개 규칙과 점유 시간에서 유효 슬롯 계산 |
| `apps/api/src/application/bookings` | 예약 요청과 결정 유스케이스 | 신청·승인·거절·만료·취소와 멱등성 |
| `apps/api/src/application/identity` | 소유자 계정·공개 프로필 | 인증된 ID와 공개 slug 연결 |
| `apps/api/src/infrastructure/persistence/sqlite` | 로컬 SQLite 어댑터 | Repository 구현·명시적 쓰기 트랜잭션·파일 저장 |
| `apps/api/src/infrastructure/persistence/supabase` | Supabase 어댑터 | 사용자 JWT 기반 데이터 API·원자적 RPC 연결 |
| `apps/api/src/infrastructure/auth` | 인증 공급자 어댑터 | 로컬 학습용 사용자와 Supabase Auth 세션 연결 |
| `apps/api/src/infrastructure/notifications` | 알림 연결 확장 지점 | 현재 no-op 기록, 후속 이메일·문자 adapter |
| `apps/api/src/infrastructure/calendar-providers` | 외부 캘린더 확장 지점 | 추후 Google·Outlook 일정 동기화 |
| `apps/api/src/platform/config` | 환경설정 검증 | DB 선택, 접속 정보, 공개 URL, 세션 비밀값 |
| `apps/api/src/platform/observability` | 진단과 감사 | request ID, 지연시간, 오류 코드, 상태 전환 감사 |
| `apps/api/src/platform/security` | 공통 보안 경계 | CSRF·Origin·rate limit·입력 길이·보안 헤더 |
| `packages/domain/src/tasks` | Todo 도메인 | 제목·완료 여부·소유권·완료 조건 |
| `packages/domain/src/calendar` | 일정 도메인 | 시간 구간·업무 분류·시간 점유 규칙 |
| `packages/domain/src/availability` | 공개 가능 시간 도메인 | 주간 규칙·날짜 예외·미팅 유형·슬롯 정책 |
| `packages/domain/src/bookings` | 예약 상태 도메인 | pending·confirmed·rejected·cancelled·expired |
| `packages/domain/src/identity` | 식별자·권한 도메인 | OwnerId, 공개 프로필과 내부 계정 구분 |
| `packages/domain/src/time` | 시간 계산 경계 | UTC instant, IANA timezone, local wall time 구분 |
| `packages/domain/src/ports` | 저장소·원자적 명령 인터페이스 | TasksRepository, CalendarRepository, BookingCommands |
| `packages/contracts/src/owner` | 소유자 API 계약 | Todo·일정·승인함 DTO |
| `packages/contracts/src/public` | 공개 API 계약 | 공유 프로필·빈 시간·신청·최소 상태 |
| `packages/contracts/src/errors` | 공통 오류 계약 | code·사용자 메시지·request ID |
| `packages/ui/src/primitives` | 기본 DOM 컴포넌트 | 버튼·카드·배지·대화상자·포커스 |
| `packages/ui/src/forms` | 입력 컴포넌트 | 라벨·오류·날짜·시간 선택 |
| `packages/ui/src/feedback` | 로딩·실패·빈 상태 | skeleton, empty state, inline alert |
| `packages/design-tokens/src` | 디자인 토큰 | 색·간격·모서리·타입·모션 의미값 |
| `database/sqlite/migrations` | 로컬 스키마 변경 이력 | 번호순 SQL, FK·CHECK·UNIQUE·인덱스 |
| `database/supabase/migrations` | 클라우드 스키마 변경 이력 | PostgreSQL DDL·RLS·함수 배포 이력 |
| `database/supabase/policies` | RLS 정책 검증 사양 | 테이블별 SELECT·INSERT·UPDATE·DELETE 소유권 |
| `database/supabase/functions` | 원자적 DB 함수 설계 | approve_booking, create_public_request, mutate_event |
| `database/seeds` | 가상 초기 데이터 | 고정 ID·기준 시각·두 사용자·충돌 요청 예제 |
| `tests/unit` | 순수 규칙 검증 | 시간 구간·상태 전이·슬롯·Todo |
| `tests/adapter-contract` | DB 어댑터 공통 계약 검증 | 같은 입력과 결과를 SQLite·Supabase에서 비교 |
| `tests/integration` | 서버·DB 연결 검증 | API 인증·검증·rollback·idempotency |
| `tests/e2e` | 사용자 흐름 검증 | 로컬 CRUD→클라우드→공유 신청→승인→고객 상태 |
| `tests/security` | 권한·공개 정보 검증 | 타인 CRUD 거부·RLS·관리 키 미노출·비밀값 로그 제거 |
| `tests/accessibility` | 접근성과 대체 UI | 키보드만 예약, 포커스, reduced motion, 2D fallback |
| `tests/performance` | 성능·번들 분리 검증 | 고객 번들에 Three.js 없음, owner scene 품질 저하 대응 |
| `tests/fixtures` | 결정적 테스트 재료 | 두 사용자, DST, 동일 슬롯 경쟁, 만료 요청 |
| `infra/local` | 로컬 실행 환경 | SQLite 파일 경로, API loopback, 프런트 프록시 |
| `infra/render` | 선택 배포 준비 | Node API+정적 웹, Supabase 연결, SPA fallback |
| `assets/models` | 3D 모델 자산 | 자체 제작 우선, 필요시 glTF·압축 자산 |
| `assets/icons` | 아이콘 자산 | 일관된 SVG 아이콘 및 라이선스 |
| `assets/fonts` | 글꼴 자산 | 한국어·영문 폰트와 라이선스 |
| `evidence/local` | 길 A 제출 증거 | CRUD·재시작·SQLite 행 확인 기록 |
| `evidence/cloud` | 길 B 제출 증거 | Supabase 저장·재시작·전환 기록 |
| `evidence/security` | 권한 제출 증거 | 두 사용자 접근 거부·RLS 활성·키 미노출 |
| `evidence/demo` | 작동 시연 | 3분 시연과 제출 URL |
| `runtime/data` | 개발 DB 저장 위치 | todo.db·WAL·SHM 런타임 파일 |
| `runtime/backups` | 로컬 백업 저장 위치 | 일관된 SQLite 백업·복구 임시본 |

지도 갱신: `node scripts/generate-map.mjs`
