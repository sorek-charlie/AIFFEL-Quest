# 현재 구조

브라우저 개인 화면 → 비밀번호 인증 Node HTTP API → application → domain·저장 어댑터. 개인 일정은 SQLite에 저장합니다. 과제 Todo는 bootstrap에서 SQLite 또는 사용자 JWT Supabase REST를 선택합니다. 외부 사이트는 개인 화면과 암호화된 소유자 요청 중계만 제공합니다. Google 최초 OAuth 연결은 로컬에서 진행합니다.
