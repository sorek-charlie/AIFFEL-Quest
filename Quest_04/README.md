# 과제 제출 점검 스킬

반복하던 과제 제출 준비를 한 문장으로 시작하는 Codex 스킬입니다.

## 불편 → 해결

과제를 제출할 때마다 AI에게 “평가 기준과 실제 파일을 비교해 줘”, “README 실행 링크를 확인해 줘”, “검증하지 않은 내용을 완료라고 쓰지 마”를 반복해서 설명했습니다. Quest_03의 README·PRD·실행 링크·로컬/Supabase 검증 기록을 정리할 때 실제로 반복된 작업입니다.

이 절차를 `assignment-submission-check`에 담았습니다. 과제별 요구 사항을 추출하고 실제 파일·내용·검증 증거를 연결하여 **확인 완료 / 부족 / 실행 확인 필요**로 구분합니다. 파일 존재를 기능 성공으로 오인하거나 과거 테스트를 최신 결과로 표시하지 않습니다.

## 파일과 제출 링크

- [SKILL.md](./SKILL.md): 이름·description·점검 절차.
- [새 대화 검증 기록](./VALIDATION.md): 설치·호출·실제 결과.
- 제출용 저장소: [AIFFEL-Quest](https://github.com/sorek-charlie/AIFFEL-Quest)
- 평가자 진입 링크: [Quest_04](https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_04)

GitHub에 파일을 올리는 것만으로 설치되지는 않습니다. 아래처럼 적용 대상 프로젝트에 설치한 뒤 **그 프로젝트에서 새 대화**를 시작합니다.

## Codex 설치·호출

현재 적용 대상: `Quest_03` 프로젝트. 설치 위치:

```text
<적용 대상 프로젝트>/.agents/skills/assignment-submission-check/SKILL.md
```

Windows PowerShell에서 내려받은 `Quest_04` 폴더를 연 뒤 실행합니다. `$targetProject`는 본인의 점검 대상 경로로 바꿉니다.

```powershell
$targetProject = 'D:\AI_Agent\숙제\Quest_03'
$skillDirectory = Join-Path $targetProject '.agents\skills\assignment-submission-check'
New-Item -ItemType Directory -Force -Path $skillDirectory | Out-Null
Copy-Item -LiteralPath '.\SKILL.md' -Destination (Join-Path $skillDirectory 'SKILL.md')
```

적용 대상 프로젝트를 Codex에서 열고 새 대화에 입력합니다.

> 과제 제출 점검해 줘.

명시적으로 지정하려면:

> $assignment-submission-check 과제 제출 점검해 줘.

다른 과제에 사용하려면 해당 프로젝트에 동일하게 설치하고 과제 안내·평가 기준을 제공하세요. Claude Code를 사용한다면 설치 경로는 `.claude/skills/assignment-submission-check/SKILL.md`입니다. 이번 실제 검증 대상은 Codex입니다.

## 결과와 범위

결과는 제출 기준, 평가 기준 대조표, 누락·미확인 사항, 수정 순서, 제출 링크·설명입니다. 기본은 읽기 전용이며 수정·삭제·GitHub 업로드·배포·실제 제출은 별도 요청이 있을 때만 진행합니다. 인증 정보·개인 DB·메일 원문은 점검 보고서에 넣지 않습니다.

## 새 대화에서 실제 확인한 결과

2026-11-03, Quest_03에 설치 후 **새 대화**에서 “과제 제출 점검해 줘.” 한 문장만 입력했습니다. 스킬이 자동 선택되어 평가 기준 대조표·수정 순서·제출 문안을 만들었습니다. 과거 Supabase 증거와 최신 재검증 미완료를 구분했고, 제출 문서의 오래된 설명도 발견했습니다. 대상 프로젝트의 구조 검사와 자동 테스트 36개 통과를 확인하면서, 실제 클라우드·UI 재검증은 실행하지 않았음을 명시했습니다. 상세 방법·실제 응답·검증 한계는 [VALIDATION.md](./VALIDATION.md)에 기록했습니다.

## 평가 기준 대응

| 기준 | 배점 | 이 제출물의 근거 |
|---|---:|---|
| 실제 반복 작업 | 30 | 위 불편 → 해결, Quest_03 제출 준비 경험 |
| 호출 시점 명확 | 30 | SKILL.md description에 과제 제출 전 점검 조건 명시 |
| 만든 이유 | 20 | README에 반복 요청과 해결 방식 설명 |
| 새 대화 재사용 | 20 | VALIDATION.md의 실제 호출 결과로 확인 |

과제 D-7 · 마감 **2026-11-09 23:59 (한국시간)**. 과제 안내 출처: 제공된 ‘노드06 AI 에이전트 도구’ PDF 18~19쪽. 강의 PDF 원본은 제출 저장소에 복사하지 않습니다.
