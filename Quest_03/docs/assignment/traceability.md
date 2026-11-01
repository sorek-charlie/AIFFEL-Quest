# 첨부 과제와 프로젝트 연결

근거: 사용자가 첨부한 「노드04_백엔드와 데이터베이스 - 데이터가 남는 서비스 만들기(2).pdf」 16~19쪽의 실습·제출 안내.
원본 PDF는 개인정보·과제 자료의 불필요한 재배포를 피하려고 이 코드 묶음에 복제하지 않았습니다.

| 과제 요구 | 구현 위치 | 검증/제출 위치 | 현재 |
|---|---|---|---|
| PRD 한 장 · 30점 | PRD.md | PRD.md | 작성 |
| Todo CRUD·재시작 · 40점 | web/features/tasks, api/application/tasks | T01, evidence/local | 구현 전 |
| 길 A 로컬 SQLite | persistence/sqlite, database/sqlite | SQLite 행·재시작 기록 | 구현 전 |
| 길 B Supabase | persistence/supabase, database/supabase | evidence/cloud | 구현 전 |
| 백엔드 경유 DB | api/transport, application, infrastructure | API·브라우저 network 확인 | 설계 |
| 사용자별 RLS · 저장/보안 총 30점 | policies, security | T02/T12, evidence/security | 설계 |
| 비밀값 분리 | .env.example, .gitignore | 번들·로그·Git 검사 | 예시 작성 |
| Render 배포 안내 | docs/operations/deployment.md | 선택 성공 시 접속 URL | 준비 문서 작성 |
| 작동 화면 또는 3분 시연 | evidence/demo | GitHub/드라이브 링크 | 미촬영 |

마감: 첨부 안내 기준 **2026-11-05 23:59**. 채점 전 재제출 가능. 이 저장소 구조 자체가 작동 앱 과제를 완료한 것은 아닙니다.
