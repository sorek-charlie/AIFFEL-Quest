# API 계약

owner/public/errors를 분리합니다. TypeScript 인터페이스는 설계 초안이며 런타임 입력 검증을 제공하지 않습니다.
구현 시 schema validator와 API 응답 테스트를 추가합니다. domain entity나 DB row를 그대로 public DTO로 쓰지 않습니다.
