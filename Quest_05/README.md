# 원하는 포즈로 이미지·영상 만드는 도구 — Quest_05

**[▶ 브라우저에서 실행](https://sorek-charlie.github.io/AIFFEL-Quest/Quest_05/)** · **[▶ 새 이미지 생성: Colab](https://colab.research.google.com/github/sorek-charlie/AIFFEL-Quest/blob/main/Quest_05/pose_tool.ipynb)** · **[전체 실행 ZIP](pose-image-tool_submission.zip)**

참조 사진과 프롬프트를 입력하고 관절을 확인하는 과제 도구입니다. OpenPose + ControlNet 이미지 실험 3건과 음악 포함 41초 댄스 데모를 포함합니다. 영상 제작 도구를 Higgsfield 외 무료 사용 옵션으로 바꿀 수 있습니다.

## 영상 제작 순서

1. **제작 도구 선택**: Meta AI/Vibes, Krea, Dola, TikTok Symphony, Higgsfield 중 선택합니다.
2. 원하는 포즈·외형·동작을 입력하고 **클립별 프롬프트를 복사**합니다. 인물 참조 이미지와 LED 영상도 화면에서 받을 수 있습니다.
3. **선택한 제작 도구 열기**를 누르고 해당 서비스에서 이미지 업로드·영상 생성을 진행합니다.
4. 생성한 짧은 MP4를 내려받아 **클립 가져오기**에 넣고 위/아래 버튼으로 순서를 정합니다.
5. 로컬 실행 화면에서 음악을 선택한 뒤 **음악 넣어 41초 MP4 저장**을 누릅니다. 짧으면 반복하고 길면 잘라 저장합니다.

도구 선택은 외부 서비스 연결과 프롬프트 준비 기능입니다. 해당 서비스의 로그인·생성을 자동으로 수행하는 API 연동은 아닙니다. 새로 추가한 네 도구로 만든 결과를 실제 실행 결과인 것처럼 표시하지 않습니다.

| 선택 도구 | 무료 상태 표시 | 용도 |
|---|---|---|
| Meta AI / Vibes | 무료 사용 안내 · 계정/지역별 한도 | 참조 이미지 애니메이션 |
| Krea AI | 제한적 무료 · 하루 100 유닛 안내 | 사용 가능한 영상 모델로 짧은 클립 |
| Dola AI | 무료 한도 확인 필요 | 첨부 PDF의 동영상 도구 |
| TikTok Symphony | 조건부 무료 · 광고주 접근 조건 | 텍스트/스토리보드 |
| Higgsfield Genjutsu | 유료/프로모션 | LED 영상의 동작 전이, 기존 데모 제작 |

무료라고 모든 모델·길이·동작 전이를 사용할 수 있는 것은 아닙니다. 조건·공식 출처·서비스별 순서는 [영상 도구 안내](docs/video_tools.md)에 정리했습니다.

## PC에서 실행하고 음악 합성하기

전체 ZIP을 내려받아 **압축을 모두 풀고 `start_demo.cmd`를 더블클릭**합니다. 실행파일 하나만 다운로드하면 나머지 파일이 없어 동작하지 않습니다.

- 기본 실행: Python 3 필요. Python 추가 패키지 설치는 필요 없습니다.
- MP4 합성: FFmpeg/ffprobe가 PATH에 있어야 합니다. 프로그램이 설치 여부를 표시합니다. Windows에서는 공식 배포판 또는 `winget install Gyan.FFmpeg`로 설치한 뒤 프로그램을 다시 실행할 수 있습니다.
- 로컬 주소: `http://127.0.0.1:8765/demo.html`. 서버는 이 PC에서만 접근합니다.
- 결과: `renders/<작업ID>/final_41s.mp4`. 원본 데모를 덮어쓰지 않습니다.
- 클립과 음악은 로컬 합성 버튼을 눌렀을 때 이 PC의 서버로 전달합니다. 외부 AI 서비스에 자동 업로드하지 않습니다.
- 음악 미선택 시 기존 데모에 포함된 녹화 오디오를 사용합니다.

GitHub Pages에서는 도구 선택·프롬프트 준비·LED/데모 재생·가져온 클립 미리보기를 사용합니다. FFmpeg 합성은 로컬 프로그램에서 실행합니다.

명령줄에서도 도구 종류와 무관하게 합칠 수 있습니다.

```powershell
python -m tools.render_video clip_01.mp4 clip_02.mp4 --audio music.mp3 --output renders/my_final.mp4 --duration 41
```

## Colab 이미지 과제

[pose_tool.ipynb](pose_tool.ipynb)를 Colab에서 열고 GPU를 선택해 셀을 순서대로 실행합니다. 기본 포즈 사진은 공개 GitHub에서 자동 다운로드하며, 실패할 때만 [pose_inputs.zip](pose_inputs.zip) 업로드를 요청합니다.

셀마다 역할을 설명했습니다. 마지막 마크다운 셀에 실제 비교 관찰을 기록했고, 포즈·프롬프트 입력 UI에서 새 이미지를 생성할 수 있습니다. 모델은 호환되는 SD 1.5 + SD 1.5용 OpenPose ControlNet입니다. SD 1.5 ControlNet을 FLUX.2에 직접 연결하지 않습니다.

| 실제 실험 | 참조 포즈 | 프롬프트 | 관찰 |
|---|---|---|---|
| 01 | 한 팔 올리기 | 무대 댄서 | 큰 팔 자세를 따름. 의상 색은 요청과 다름 |
| 02 | 01과 동일 | 우주비행사 | 팔 자세를 유지하며 우주복·실내 우주 배경으로 바뀜 |
| 03 | 양팔 내리기 | 01과 동일 | 팔이 내려감. 인물 세부는 완전히 고정되지 않음 |

2026-11-12 Colab Tesla T4에서 실제 실행했습니다. 시드 42 / 25스텝 / CFG 7.5 / ControlNet 1.0 / 512×768. [실행 증거](samples/execution_evidence.json) · [프롬프트](prompts.md) · [상세 관찰·한계](docs/observations.md)

![실험 비교판](samples/comparison.png)

## 기존 41초 데모

[음악 포함 최종 영상](dance_final_41s.mp4) · [LED 관절 영상](samples/led_motion_41s.mp4)

Higgsfield Genjutsu에서 실제 생성한 영상을 20.5초씩 두 번 연결했습니다. 최종 검증: 41.000초 / H.264 24fps / AAC 오디오. LED는 직접 작성한 관절 시간표이며 GD의 실제 관절 추출 결과가 아닙니다. 음악에는 사용자 녹화의 해설·현장 소리가 포함됩니다. 다른 무료 도구에서 똑같은 동작·인물 일관성이 유지된다고 보장하지 않습니다.

## 정리한 폴더

```text
Quest_05/
├── README.md, prompts.md, pose_tool.ipynb
├── index.html, demo.html, styles.css, app.js, provider_ui.js
├── video_tools.json                 # 영상 도구 설정
├── start_demo.cmd, launch_demo.py, demo_server.py
├── dance_final_41s.mp4               # 보존한 최종 데모
├── samples/                         # 실제 참조·관절·생성 결과
├── docs/                            # 사용법·관찰·정리 기록
├── tools/                           # 합성·LED 제작·패키징·검증
├── pose_inputs.zip, pose-image-tool_submission.zip
├── source_media/                    # 로컬 원본 보관, 공개/ZIP 제외
└── renders/                         # 새 합성 결과, 공개/ZIP 제외
```

중복 빌더·실패 프로그램·임시 프레임을 삭제하고, 실행 코드를 UI·설정·합성·패키징으로 분리했습니다. 사용자 원본 녹화는 삭제하지 않고 로컬에 보관합니다. [정리 기록](docs/cleanup_report.md)

제출할 핵심 파일은 README, pose_tool.ipynb, samples/, prompts.md입니다. 추가로 실행 화면과 41초 영상 데모를 제공합니다. [전체 파일 링크](submission_files.json) · [GitHub Quest_05](https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_05). 학습 사이트 제출란 등록은 별도입니다.
