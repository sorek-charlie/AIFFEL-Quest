# DB 함수 계약

| 함수 | caller | 원자적으로 할 일 | 필수 방어 |
|---|---|---|---|
| approve_booking | 인증된 owner | 잠금→만료/규칙/충돌→상태+event+감사+멱등성 | auth.uid 소유권·고정 search_path·최소 grants |
| mutate_event | 인증된 owner | 같은 잠금→충돌→일정 변경 | 연결 예약과 상태 일치 |
| update_availability | 인증된 owner | 같은 owner 잠금→규칙 변경 | 승인과 경쟁 처리 |
| create_public_request | 서버 제한 역할 | 공개 여부·슬롯 검증→pending 저장 | owner는 slug로 조회, rate limit은 API |
| cancel_request | owner 또는 검증된 서버 경로 | 같은 잠금→상태+점유 취소 | capability/owner 확인 |
| expire_requests | 서버 제한 작업 | 만료 pending 정리 | confirmed 변경 금지 |

함수 SQL 실행 원본은 migrations 아래 둡니다. 이 문서는 구현 계약만 담습니다.
