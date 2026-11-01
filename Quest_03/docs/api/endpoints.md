# API 계약 초안 · 아직 서버 미구현

공통 prefix `/api/v1`. 쓰기 body는 JSON. 서버가 인증된 주체를 결정합니다.

| 경로 | 메서드 | 권한 | 결과/조건 |
|---|---|---|---|
| /auth/session | GET | 세션 | 로그인 여부·최소 프로필 |
| /owner/tasks | GET, POST | 소유자 | 자기 Todo 목록/생성 |
| /owner/tasks/:id | PATCH, DELETE | 소유자 | version 검사, 수정/삭제 |
| /owner/events | GET, POST | 소유자 | 기간별 일정/점유 생성 |
| /owner/events/:id | PATCH, DELETE | 소유자 | 동일 잠금 아래 이동/취소 |
| /owner/availability | GET, PUT | 소유자 | 공개 규칙 조회·대체 |
| /owner/meeting-types | GET, POST | 소유자 | 미팅 유형 관리 |
| /owner/booking-requests | GET | 소유자 | 상태별 cursor 페이지 목록 |
| /owner/booking-requests/:id/approve | POST | 소유자 | version·Idempotency-Key, 원자적 승인 |
| /owner/booking-requests/:id/reject | POST | 소유자 | 대기 요청 거절 |
| /owner/booking-requests/:id/cancel | POST | 소유자 | 요청/확정 취소 |
| /public/:slug | GET | 익명 | 공개 이름·미팅 유형·시간대 |
| /public/:slug/slots | GET | 익명 | meetingType, from, to, timeZone; 빈 시간 |
| /public/:slug/requests | POST | 익명 | 202 pending, 멱등성 키 필수 |
| /public/request-status | POST | capability | 최소 상태·시각, no-store |
| /public/request-cancel | POST | capability | 정책 내 취소, 멱등성 키 |

민감한 상태 토큰은 query string으로 받지 않습니다. 공개 응답은 no-store를 기본으로 하고 캐시는 추후 명시적으로 설계합니다.

## 오류

400 VALIDATION_ERROR / 401 UNAUTHENTICATED / 403 FORBIDDEN / 404 NOT_FOUND / 409 SLOT_CONFLICT, VERSION_CONFLICT, IDEMPOTENCY_MISMATCH / 410 REQUEST_EXPIRED / 429 RATE_LIMITED / 503 RETRY_LATER.
타인 private 자원은 존재 여부를 감추기 위해 404로 응답할 수 있으며 모든 소유자 경로에서 정책을 통일합니다.
응답 모양: `{error: {code, message, requestId}}`. SQL·스택·내부 식별자·토큰은 넣지 않습니다.

## 쓰기 재시도

신청·승인은 Idempotency-Key를 지원합니다. 같은 key+같은 body는 같은 결과, 다른 body는 409입니다.
신청 응답의 원문 capability를 재전송하기 위해 짧은 TTL의 암호화된 응답 사본을 서버에 보관하는 설계가 필요합니다. capability_hash만으로 원문을 재생성하지 않습니다.
세션/작업별 scope를 묶어 다른 고객이 동일 키로 결과를 가져가지 못하게 합니다. 이 세부 구현을 완성한 뒤 공개 신청을 활성화합니다.
