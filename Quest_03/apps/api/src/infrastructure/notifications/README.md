# 알림 연결 확장 지점

경로: `apps/api/src/infrastructure/notifications`

**책임**: 현재 no-op 기록, 후속 이메일·문자 adapter.

**연결 규칙**: DB 커밋 뒤 outbox로 전달, 명시적 서비스 설정 이후 사용.

**금지**: 메일·문자 발송을 트랜잭션 안에서 실행.

**구현 시 배치할 파일**: NotificationPort.ts, NoopNotifier.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 0.2 구현 상태

uploads.mjs/extract-image.ps1: Windows 내장 OCR과 텍스트/ICS 추출. 알림 발송 기능과는 별개인 로컬 입력 처리입니다. 테스트 이미지에서 OCR API 경로 확인. 외부 발송은 미구현.
