# 실험 프롬프트와 41초 동작 시간표

## 이미지 실험 공통 조건

SD 1.5 + OpenPose ControlNet / seed 42 / 25 steps / CFG 7.5 / ControlNet 1.0 / 512×768 / UniPCMultistepScheduler. 각 실험마다 CPU generator를 시드 42로 새로 초기화했습니다.

| 실험 | 참조 | 프롬프트 | 결과 |
|---|---|---|---|
| 01 | pose_01.png | A · 무대 댄서 | output_01.png |
| 02 | pose_01.png | B · 우주비행사 | output_02.png |
| 03 | pose_02.png | A · 무대 댄서 | output_03.png |

### A — 실험 01·03에서 완전히 동일

full body photograph of one adult blonde female dancer, white sports jacket, black trousers, white sneakers, dark concert stage, blue and pink stage lighting, facing camera, realistic anatomy, feet visible

### B — 실험 02

full body photograph of one adult female astronaut, silver space suit, boots, on a lunar base, soft cinematic lighting, facing camera, realistic anatomy, feet visible

### Negative prompt — 세 실험 공통

bad anatomy, extra limbs, extra people, missing hands, cropped feet, deformed fingers, text, watermark

## 영상 제작 프롬프트

# 41초 프롬프트 → LED → 인물 영상 제작

20.5초 동작을 두 번 반복합니다. 아래 LED는 시간표로 직접 작성한 관절 애니메이션이며 GD의 실제 동작을 추출한 결과가 아닙니다. 원본 녹화의 음악과 현장 소리를 사용하므로 깨끗한 음원과 다릅니다. 박자 일치는 최종 생성 후 청취 검수가 필요합니다.

| 시간(초) | 관절 동작 프롬프트 |
|---|---|
| 0–2 | 두 LED 인물이 오른손 대각선 인사. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 2–4 | 두 LED 인물이 양팔 V자와 무릎 바운스. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 4–6 | 두 LED 인물이 좌우 번갈아 팔 밀기. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 6–8 | 두 LED 인물이 좌우 사이드 스텝. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 8–10 | 두 LED 인물이 무릎 번갈아 들기. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 10–12 | 두 LED 인물이 상체 숙였다 펴기. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 12–14 | 두 LED 인물이 팔 교차 후 펼치기. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 14–16 | 두 LED 인물이 머리 위 팔 웨이브. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 16–18 | 두 LED 인물이 무릎 들기와 팔 펌핑. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 18–20.5 | 두 LED 인물이 시작 자세로 돌아와 마무리. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 20.5–22.5 | 두 LED 인물이 오른손 대각선 인사. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 22.5–24.5 | 두 LED 인물이 양팔 V자와 무릎 바운스. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 24.5–26.5 | 두 LED 인물이 좌우 번갈아 팔 밀기. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 26.5–28.5 | 두 LED 인물이 좌우 사이드 스텝. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 28.5–30.5 | 두 LED 인물이 무릎 번갈아 들기. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 30.5–32.5 | 두 LED 인물이 상체 숙였다 펴기. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 32.5–34.5 | 두 LED 인물이 팔 교차 후 펼치기. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 34.5–36.5 | 두 LED 인물이 머리 위 팔 웨이브. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 36.5–38.5 | 두 LED 인물이 무릎 들기와 팔 펌핑. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |
| 38.5–41 | 두 LED 인물이 시작 자세로 돌아와 마무리. 어깨·팔꿈치·손목·골반·무릎·발목이 연결된 상태로 부드럽게 움직인다. |

## Higgsfield Genjutsu 입력

Two fictional adult blonde women, age 25, beautiful original faces, full-body frontal view. Left dancer wears a white sports jacket, right dancer a red sports jacket, both black trousers and white sneakers. Rebuild both LED figures as the two women in the reference image. Precisely preserve both figures' shoulder, elbow, wrist, hip, knee and ankle trajectories, choreography, spacing and timing. Dark concert stage, subtle blue and pink light, natural anatomy, consistent faces and clothing, fixed camera, feet visible throughout. No LEDs on their bodies, no text, no extra people. Preserve motion rather than inventing new choreography.

- 모드: Motion transfer
- 영상: led_motion_20_5s.mp4
- 참조: blonde_dancers_reference.png
- 결과 20.5초를 두 번 이어 붙이고 기존 오디오를 맞춰 41초로 저장
- 생성 완료: Higgsfield 결과를 20.5초로 잘라 두 번 연결하고 음악을 합친 dance_final_41s.mp4.


LED는 시간표 기반으로 직접 작성한 관절 애니메이션입니다. 임의의 자연어를 이해하는 학습형 text-to-motion 모델이나 GD 실제 동작 추출 결과로 설명하지 않습니다. 영상 생성 서비스의 seed 고정 여부는 기록에서 검증하지 못했으므로 고정 시드 실험으로 취급하지 않습니다.
