# 환경과 비밀값

`.env.example`은 설정 항목 설명입니다. 현재 앱이 실행되는 구성 파일은 아닙니다.

| 값 | 노출 위치 | 용도 |
|---|---|---|
| APP_ORIGIN | 서버 | 쿠키·Origin 검증 |
| DATABASE_PROVIDER | 서버 | sqlite/supabase 선택 |
| SQLITE_PATH | 서버 | 로컬 파일 위치 |
| SUPABASE_URL | 서버 | 프로젝트 주소 |
| SUPABASE_PUBLISHABLE_KEY | 서버 | 사용자 JWT와 일반 요청 |
| SUPABASE_SERVER_SECRET_KEY | 서버 전용 | 필요한 제한된 공개 작업에만 사용 |
| SESSION_SECRET | 서버 전용 | 세션·암호화 키 관리의 구현 시 분리 필요 |
| AUTH_PROVIDER | 서버 | local-dev/supabase |

환경별 구성: local(비공개 학습), test(가상 계정), staging(검증), production(실사용).
서로 같은 DB·키를 공유하지 않습니다. 값은 배포 서비스의 secrets 설정으로 주입하고 로그에 출력하지 않습니다.
기존 Supabase 프로젝트의 키 명칭이 다르면 실제 콘솔·공식 문서와 맞춰 어댑터 설정을 확정합니다.
