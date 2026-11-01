# 도메인 규칙의 단일 위치

UI·서버 프레임워크·DB를 모르는 순수 규칙과 저장 인터페이스를 둡니다.
tasks, calendar, availability, bookings, identity, time은 업무 개념이며 ports는 외부 효과 경계입니다.
현재 예약 상태 사양 JSON만 있고 실행 규칙 구현은 없습니다.
