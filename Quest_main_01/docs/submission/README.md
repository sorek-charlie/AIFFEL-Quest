# 메인퀘스트 제출 안내

기준일: 2026-11-04. 이 폴더는 제출 자료 묶음이며 제출 완료 확인서가 아니다.

## 준비한 자료

| 제출·시연 자료 | 위치 | 용도 |
|---|---|---|
| 제출 보고서 | [제출보고서.md](../../제출보고서.md) | 전체 서비스·최신 기능·구현·한계·제출 파일 목록 |
| 서비스 요구사항 | [PRD.md](../../PRD.md) | 개요·사용자·문제·성공 기준·제외 범위 |
| 회고 초안 | [retrospective.md](../../retrospective.md) | 어려움·AI 협업·배운 점·다음 단계 |
| AI 협업 기록 | [AI_COLLABORATION.md](AI_COLLABORATION.md) | 개인정보를 뺀 실제 요청 발췌와 작업 요약 |
| 가상자료 | [샘플 안내](../../samples/README.md) | 5개년 XLSX, 기타 TXT |
| AI 영상 제작·최신 시연 대본 | [AI영상제작.md](../../AI영상제작.md) | 로그인·가입 타이머를 포함한2분50초 구성·복사 지시문 |
| AI 영상·Cloudflare 가이드 | [가이드.md](../../가이드.md) | AI 전달 지시문·편집 순서·기존 배포 주소 활용 |
| 기능 검증·캡처 | [VERIFICATION.md](VERIFICATION.md) | 샘플 입력·보고서·초기화 확인 |
| 실행·배포 안내 | [README.md](../../README.md) | 로컬 실행·GitHub Pages 설정 |

수업의 메인퀘스트 안내·정리노트와 제출 폼을 기준으로 구성했다. 안내에는 PRD·회고 각 1페이지 수준, 실행 가능한 서비스, 3분 이내 시연이 포함된다. 제공된 제출 폼에는 이름·GitHub 저장소 URL·배포 결과 URL이 필수로 표시돼 있었다. 폼이 바뀌었으면 실제 항목을 우선한다. 수업 PDF 원문이나 실제 고객 첨부는 공개 저장소에 복사하지 않는다.

## 제출자가 마무리할 항목

- [ ] PRD 작성자 이름 기입, 회고 내용과 본인 소감 확인.
- [x] 공개 파일·전체 Git 이력과 비공개 식별문자열 점검 통과: `python dev/scripts/check_public_repo.py --history`.
- [x] [공개 GitHub 저장소](https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_main_01)에 프로그램·제출 문서·가상 샘플 게시. `.claude/launch.json`, 실제 회사자료·인증서·EXE는 제외. 가상 XLSX 한 파일만 공개 예외로 명시.
- [x] Cloudflare Pages 배포 후 실제 HTTPS 주소에서 가상 샘플 업로드·보고서 1~4 HTML 저장·Reset 확인: [프로그램 실행](https://tax-return-review-quest.pages.dev/).
- [x] ID/PW 로그인·회원가입·2~3분 안내·가입10초 후 자동 로그인·로그아웃을 실제 배포 주소에서 검증. 팝업 대기는 가상 시계, 가입 대기는 실제10초를 사용.
- [ ] 대본으로 영상 녹화, 3분 이하 및 소리 확인. 필요한 경우 강좌가 요구하는 제출 위치에 업로드.
- [ ] 제출 폼에 본인 이름, 실제 GitHub 저장소 URL, 실제 배포 URL 입력. PRD·회고·협업 기록·영상은 폼이나 강좌의 해당 제출 위치에 연결.

| 실제 제출 값 | 기록 |
|---|---|
| 제출자 이름 | 제출자가 입력 |
| GitHub 저장소 URL | https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_main_01 |
| 배포 URL | https://tax-return-review-quest.pages.dev/ · 배포·브라우저 검증 완료 |
| 시연 영상 URL 또는 파일 | [2분50초·1080p 캡처 기반 소개 MP4](../../outputs/main-quest/video/main-quest-capture-introduction-1080p.mp4) 제작. 실제 전체 동작 녹화는 미완료 |

후속 요청으로 Cloudflare 배포·실제 URL 검증과 공개 GitHub 게시를 완료했다. 이후 제작한 씬 이미지·소개 MP4와 최신 자료는 AIFFEL-Quest의 Quest_main_01 폴더에 함께 게시했다. 실제 녹화본이 없는 부분은 소개 MP4에서 기능 설명으로 표시했다. 제출 폼 전송은 하지 않았다. 1페이지 파일이 필수인 경우 PRD·회고를 각각 인쇄 미리보기로 확인해 PDF로 저장한다. Markdown 화면의 페이지 수는 렌더러에 따라 달라진다.

실행 주소에서 직접 회원가입한 뒤 사용한다. 공용 ID/PW나 실제 개인 비밀번호를 제출 문서에 적지 않는다. 로컬 HTML·EXE는 오프라인 자료 처리 방식이며 웹 계정 기능은 Cloudflare 배포에서 제공한다.
