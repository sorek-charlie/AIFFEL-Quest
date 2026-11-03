# 의존성

web은 API 소스·DB SDK·서버 비밀값을 import하지 않습니다. domain은 순수 규칙이며 HTTP·DB·환경변수에 의존하지 않습니다. application은 domain과 저장 인터페이스에 의존하고 bootstrap이 어댑터를 선택합니다. scene은 표시만 담당합니다.
