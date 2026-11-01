# 0006 · 입력과 Android → Google → PC 연결

2026-10-29. 사용자가 요청한 새 입력·연동 구조입니다.

- 직접 입력과 고객 신청/소유자 Confirm은 기존 API를 사용합니다.
- 텍스트·파일·이미지 OCR은 후보로 추출하고 검토 후 저장합니다. 원본 파일은 보관하지 않으며 OCR 임시 파일은 처리 뒤 삭제합니다.
- 애매한 날짜는 자동 일정으로 확정하지 않습니다. YYYY-MM-DD와 명확한 HH:mm은 일정 후보로, 다른 줄은 할 일 후보로 추출합니다. 최대 100줄을 검토합니다.
- PC Google OAuth는 Desktop client/PKCE/일회성 state와 기존 로그인 세션을 사용합니다. Gmail readonly와 Calendar readonly만 요청합니다. 연결 계정이 지정 주소와 다르면 저장을 거부합니다.
- Gmail 받은편지함 최근 7일을 한 시간마다 읽고 제목을 Todo로 저장합니다. 읽음/삭제/발송 상태는 바꾸지 않습니다. 원격 메시지 ID로 중복을 방지합니다.
- Google 일정은 1분 간격으로 확인합니다. 최초 범위는 지난 1년~향후 2년, 이후 syncToken으로 변경·취소를 반영합니다. 그 범위 밖의 과거/미래 전체 이력을 보장하지 않습니다.
- 원격 일정·ICS의 생성·변경·취소는 로컬 BEGIN IMMEDIATE 안에서 기존 점유를 검사합니다. 충돌한 항목은 검토함에 남깁니다. 강제 반영은 확인 주기를 앞당기며 충돌 경계를 우회하지 않습니다.
- 토큰·OAuth 설정은 private_config에 AES-GCM 암호화 저장합니다. 키는 DB 옆 로컬 파일입니다. OS 계정 접근 제어를 대체하지 않습니다.
- 카카오톡 일반 수신함을 읽는 공개 API는 연결하지 않습니다. PC는 내보낸 TXT를 매시간 확인하는 대체 경로를 제공합니다.
- Android는 사용자가 허용한 com.kakao.talk 알림의 표시 내용만 기기 내부 검토함에 수집합니다. 수집 기본값은 꺼짐. 사용자가 제목/시간을 확인한 후 기기의 지정 Google 캘린더에 저장합니다.
- Android는 전체 대화 DB에 접근하지 않으며 네트워크 권한도 요청하지 않습니다. OS Google 동기화 어댑터가 클라우드에 전송합니다. 기기 및 Google 동기화 지연이 있을 수 있습니다.
- USB-C는 앱 설치 파일 전송 등에 사용할 수 있지만 캘린더 접근 API나 실시간 동기화 권한 그 자체가 아닙니다.
- PC 웹은 15초마다 변경을 확인합니다. 작성 중인 폼이 있으면 자동 재렌더를 미룹니다. 사용자는 강제 반영으로 즉시 다시 확인할 수 있습니다.
- PC/Android 비밀번호는 각 기기에 별도 해시 저장하며 초기 비밀번호를 소스에 고정하지 않습니다. PC는 scrypt, Android는 PBKDF2-HMAC-SHA256. 변경 시 기존 PC 세션을 무효화합니다.

공개 HTTPS 서버와 Google push notification 채널을 통한 즉시 웹 푸시는 후속 범위입니다.
실제 Google 인증, Android 기기 권한·알림·Calendar Provider·클라우드 동기화 경로는 사용자 계정/기기에서 추가 검증해야 합니다.

공식 참고: [Google Desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [Android NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService), [Android Calendar Provider](https://developer.android.com/identity/providers/calendar-provider), [Kakao 메시지 API](https://developers.kakao.com/docs/ko/kakaotalk-message/common), [Windows OCR](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine.trycreatefromuserprofilelanguages).
