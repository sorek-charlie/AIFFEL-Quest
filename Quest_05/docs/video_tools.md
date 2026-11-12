# 영상 제작 도구 선택

기준 자료: 사용자가 제공한 `#02_AI영상도구_4종_타임스탬프_정리노트.pdf`. 서비스 안내 확인일: 2026-11-12. PDF의 계정 삭제·재가입 시연은 프로그램 기능으로 구현하지 않았습니다.

| 도구 | 프로그램의 표시 | 적합한 입력 | 확인할 점 |
|---|---|---|---|
| Meta AI / Vibes | 무료 사용 안내 | 인물 이미지 + 움직임 프롬프트 | 지역·계정별 제공 여부와 한도. LED 영상의 관절을 그대로 옮긴다고 보장하지 않음 |
| Krea AI | 제한적 무료 | 이미지 또는 텍스트 | 공식 Free는 하루 100 유닛. 현재 영상 모델의 이용 권한과 차감량은 계정에서 확인 |
| Dola AI | 무료 한도 확인 필요 | 이미지·텍스트, 계정에 제공되는 영상 기능 | 첨부 PDF의 공식 링크를 사용. 무료 지급량·모델·지원 길이는 미확인 |
| TikTok Symphony | 조건부 무료 | 텍스트·스토리보드 | 스튜디오 무료와 Seedance 접근 조건은 다름. 광고 실적·크레딧 확인 |
| Higgsfield Genjutsu | 유료/프로모션 | LED 영상 + 인물 참조 이미지 | 기존 41초 데모를 제작한 도구. 상시 무료로 표시하지 않음 |

## 실제 사용 순서

1. 웹 화면에서 제작 도구를 선택합니다. 기본 선택은 Meta AI / Vibes입니다.
2. 포즈와 원하는 외형·동작 프롬프트를 입력합니다.
3. 클립 분할 길이를 고릅니다. 이것은 제작 계획의 길이이며 서비스가 그 길이를 지원한다는 보장은 아닙니다.
4. 클립별 프롬프트를 복사하고 '선택한 제작 도구 열기'를 누릅니다.
5. 서비스에서 로그인하고, 이미지/영상 업로드와 생성을 직접 진행합니다. 프로그램은 외부 서비스의 비공개 API를 호출하지 않으며 자동 생성 성공을 표시하지 않습니다.
6. 결과 MP4를 내려받아 프로그램의 '클립 가져오기'에 넣습니다. 위/아래 버튼으로 순서를 정합니다.
7. 음악을 선택합니다. 생략하면 기존 데모에 포함된 녹화 오디오를 사용합니다.
8. 로컬 실행 화면에서 '음악 넣어 41초 MP4 저장'을 누릅니다. 결과는 `renders/<작업ID>/final_41s.mp4`에 저장됩니다.

GitHub Pages는 클립 미리보기·도구 연결·프롬프트 준비를 지원합니다. FFmpeg를 사용하는 합성은 전체 ZIP을 압축 해제하고 `start_demo.cmd`를 실행한 로컬 환경에서 동작합니다. 합성 파일은 선택한 외부 AI 서비스에 자동 전송되지 않습니다.

같은 인물·정확한 관절 전이는 단순 이미지 애니메이션에서 유지되지 않을 수 있습니다. 동작 전이와 이미지 애니메이션을 같은 기능으로 간주하지 않습니다. 기존 41초 영상은 Higgsfield에서 실제 생성했고, 추가한 네 도구로 새 영상을 생성한 결과는 아직 포함하지 않습니다.

## 공식 자료

- [Meta Vibes](https://ai.meta.com/meta-ai/vibes/)
- [Krea Free 요금제](https://www.krea.ai/pricing)
- [Dola — 첨부 PDF의 공식 서비스](https://www.dola.com/chat/)
- [TikTok Symphony 크레딧](https://ads.tiktok.com/resources/help/article/about-symphony-credits)
- [TikTok Seedance 접근 조건](https://ads.tiktok.com/resources/help/article/about-dreamina-seedance-model-access-and-usage-limits-in-tiktok-symphony)
- [Higgsfield Genjutsu](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-genjutsu)
