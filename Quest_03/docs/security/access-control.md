# 권한·RLS·비밀값 경계

| 주체 | 허용 | 금지 |
|---|---|---|
| 익명 고객 | 공개 프로필·빈 슬롯·신청 | private 테이블 직접 CRUD, 전체 요청 열람 |
| 상태 링크 소지자 | 자기 요청의 시간·상태, 허용된 취소 | 연락처·개인 메모·다른 요청 조회 |
| 소유자 | 자기 Todo·일정·규칙·요청 결정 | 다른 owner 데이터 조회·변경 |
| 서버 제한 작업 | 공개 요청 함수·만료 정리 등 | 일반 사용자 CRUD를 관리자 권한으로 일괄 처리 |

## Supabase 경로

로그인은 백엔드가 공급자와 처리하며 브라우저에는 불투명 세션 쿠키를 둡니다. 운영에서는 Secure/HttpOnly/SameSite를 설정합니다.
백엔드는 해당 사용자의 access token으로 일반 data API/RPC를 호출해 RLS를 유지합니다. 토큰 보관은 서버 전용 저장소와 암호화 정책으로 다룹니다.
owner_id=auth.uid()를 기준으로 SELECT/DELETE와 UPDATE의 기존 행·새 행, INSERT의 새 행 모두 통제합니다. 서비스 키 테스트만으로 RLS 통과를 주장하지 않습니다.
승인·점유 변경은 제한된 RPC로만 허용하고 직접 테이블 쓰기 권한을 제거합니다. SECURITY DEFINER가 필요하면 최소 권한 소유자, 고정 search_path, 명시적 actor 검사, REVOKE/GRANT를 적용합니다.
공개 요청 함수는 서버 전용 역할/권한으로만 실행하고 slug에서 owner를 서버가 결정합니다. body의 owner_id를 신뢰하지 않습니다.

## 브라우저 경계

프런트의 모든 데이터 CRUD는 백엔드만 호출합니다. 서비스 비밀키는 브라우저 bundle·HTML·VITE_* 변수에 넣지 않습니다.
쿠키 인증 쓰기 요청은 CSRF 토큰/Origin 검사를 적용하고 같은 origin 프록시 배포를 우선합니다.
SQL 파라미터 바인딩·입력 길이·rate limit을 적용합니다. CORS·RLS·로그인은 서로 다른 보호 계층입니다.

보안 관련 위 내용은 프로젝트 설계입니다. 공식 RLS 동작의 참고 출처는 docs/sources/references.md를 봅니다.
