# 개인 API

인증: /api/v1/auth/session, setup, login, logout, change-password, google/callback.

인증된 /api/v1/owner 아래: state, tasks, events, projects, settings, inputs, inputs/text, inputs/:id/confirm, integrations, integrations/force, integrations/google/*, gmail-review/*, todo/*.

제거된 public 예약·bookings 결정·public-link 경로는 404를 반환합니다. 직접 입력의 source는 manual로 고정합니다.

인증된 POST /api/v1/owner/inputs/upload: 최대8MB 문서/이미지를 읽어 검토 후보만 생성합니다. 확인 API 호출 전에는 계획에 저장하지 않습니다.
