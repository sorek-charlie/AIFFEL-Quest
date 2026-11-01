# 데이터베이스 작업 추가 지침

SQLite와 Supabase의 SQL은 별도 migration으로 작성합니다. 이미 적용된 파일은 수정하지 않습니다.
Supabase 함수·RLS의 배포 원본은 migrations 한 곳에 둡니다. policies/functions에는 계약·검증을 둡니다.
새 schema 변경은 forward 적용·실패 복구·데이터 보존을 확인합니다.
개발·테스트 DB만 사용하고 운영 연결이나 실데이터를 기본값으로 삼지 않습니다.
RLS는 익명·사용자 A·사용자 B로 실제 검사합니다. 관리자 키 결과만으로 통과 판정하지 않습니다.
