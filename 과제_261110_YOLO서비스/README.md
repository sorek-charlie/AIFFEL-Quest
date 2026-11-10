# 선택과제 A | 버스 사진의 객체 탐지와 인스턴스 분할

버스 사진에서 객체를 탐지하고 인스턴스별로 분할한 과제입니다. Windows에서 실행 코드로 직접 재검증했으며, 아래 이미지와 링크에서 결과를 확인할 수 있습니다.


## 폴더 구성

- [프로그램 파일](%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8%20%ED%8C%8C%EC%9D%BC/): 실행 코드, 설치 목록, 모델 가중치, 입력 사진
- [참고자료](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/): 보고서, 탐지·분할 결과, 좌표·마스크, 실행·검증 기록

## 바로 열기

| 항목 | 파일 |
|---|---|
| 실행 코드 | [run.py](%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8%20%ED%8C%8C%EC%9D%BC/run.py) |
| 설치 목록 | [requirements.txt](%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8%20%ED%8C%8C%EC%9D%BC/requirements.txt) |
| 제출 보고서 | [PDF 보고서](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/Bus_Assignment_Report.pdf) · [텍스트 보고서](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/REPORT.md) |
| 입력 사진 | [bus.jpg](%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8%20%ED%8C%8C%EC%9D%BC/input/bus.jpg) |
| 실제 실행 검증 | [Windows 실행 점검 기록](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/WINDOWS_RUN_CHECK.txt) · [제출 파일 점검](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/SUBMISSION_CHECK.txt) |
| 재실행 환경 | [Windows 패키지 버전](%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8%20%ED%8C%8C%EC%9D%BC/requirements-windows-verified.txt) |
| 결과 데이터 | [결과 요약 JSON](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/summary.json) · [실행 환경·해시·설정](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/manifest.json) |

`run.py` 링크는 실행 코드를 엽니다. 실제 추론은 저장소를 다운로드한 뒤 아래 재실행 명령으로 실행합니다.

## 실제 실행 결과

Windows / Python 3.11.14 / Ultralytics 8.4.208 / CPU에서 네 조건 모두 정상 종료했습니다.

| 작업 | 임계값 | 검출 결과 | 결과 이미지 | 좌표·점수 JSON | 마스크 |
|---|---|---|---|---|---|
| 객체 탐지 | 0.25 | 버스 1대 · 사람 4명 | [이미지](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/detect_0.25/result.jpg) | [JSON](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/detect_0.25/boxes.json) | 해당 없음 |
| 객체 탐지 | 0.50 | 버스 1대 · 사람 4명 | [이미지](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/detect_0.50/result.jpg) | [JSON](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/detect_0.50/boxes.json) | 해당 없음 |
| 인스턴스 분할 | 0.25 | 버스 1대 · 사람 4명 | [이미지](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.25/result.jpg) | [JSON](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.25/boxes.json) | [객체별 PNG 폴더](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.25) |
| 인스턴스 분할 | 0.50 | 버스 1대 · 사람 4명 | [이미지](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.50/result.jpg) | [JSON](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.50/boxes.json) | [객체별 PNG 폴더](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.50) |

두 임계값에서 객체 수가 같았습니다. 이번 사진에서는 모든 검출 점수가 0.50 이상이므로 임계값을 올려도 제거되는 객체가 없었습니다. 정답 라벨이 없어 정확도·mAP 수치는 산출하지 않았습니다.

### 객체 탐지 비교

왼쪽은 conf=0.25, 오른쪽은 conf=0.50입니다. 이미지를 클릭하면 원본 크기로 열 수 있습니다.

[![객체 탐지 임계값 비교](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/detect_comparison.jpg)](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/detect_comparison.jpg)

### 인스턴스 분할 비교

왼쪽은 conf=0.25, 오른쪽은 conf=0.50입니다. 박스는 위치를, 마스크는 객체에 속한다고 예측한 픽셀 영역을 나타냅니다.

[![인스턴스 분할 임계값 비교](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_comparison.jpg)](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_comparison.jpg)

### 개별 마스크 바로 열기

마스크는 원본과 같은 810×1080 크기의 이진 PNG이며, 각 실행의 JSON에서 `id`와 `mask_file`을 대조할 수 있습니다.

| 객체 ID | conf=0.25 | conf=0.50 |
|---|---|---|
| 0 | [mask_00.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.25/mask_00.png) | [mask_00.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.50/mask_00.png) |
| 1 | [mask_01.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.25/mask_01.png) | [mask_01.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.50/mask_01.png) |
| 2 | [mask_02.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.25/mask_02.png) | [mask_02.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.50/mask_02.png) |
| 3 | [mask_03.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.25/mask_03.png) | [mask_03.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.50/mask_03.png) |
| 4 | [mask_04.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.25/mask_04.png) | [mask_04.png](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/windows_verified/segment_0.50/mask_04.png) |

최초 Linux 실행 결과도 [기존 결과 폴더](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/yolo)와 [실행 기록](%EC%B0%B8%EA%B3%A0%EC%9E%90%EB%A3%8C/outputs/yolo/manifest.json)에 보존했습니다. PDF와 텍스트 보고서는 최초 실행을 설명하며, Windows 추가 검증은 위 실행 점검 기록에서 확인할 수 있습니다.

## 1. 목적과 입력
첨부한 bus.jpg에서 버스와 보행자의 클래스·위치·점수를 추출하고, 사각형 박스와 픽셀 마스크가 제공하는 정보의 차이를 비교한다. conf=0.25와 0.50을 비교하여 임계값이 결과에 미치는 영향을 관찰한다. 학습은 수행하지 않고 공개 사전학습 가중치로 추론한다.

입력은 사용자가 제공한 bus.jpg 한 장이다. 촬영자·원본 배포 조건은 별도로 확인되지 않았다. 개인 촬영 사진이라고 단정하지 않는다. 별도 자기 사진의 일반화 실험은 아직 수행하지 않았다. 외부 공유 전 사진의 출처·공유 조건을 확인해야 한다.

## 2. 재실행 방법
Python 3.11 또는 3.12 환경을 사용한다. Windows Python 3.11.14에서 실행을 검증했다. 터미널에서 이 과제의 `프로그램 파일` 폴더로 이동한다. 가상환경을 만든 뒤 다음 순서로 실행한다.

```bash
cd "프로그램 파일"
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python run.py --source input/bus.jpg --output outputs/my_run
```

모델 가중치 두 개는 제출 폴더에 포함되어 있다. 패키지 설치에는 인터넷이 필요하며, 가중치를 삭제한 경우 모델도 다시 다운로드한다. GPU 없이 CPU에서 실행한다. 다른 사진은 `--source input/my_photo.jpg --output outputs/my_photo`로 지정한다. 기존 결과와 구별되는 출력 폴더를 사용한다. run.py의 기본 경로는 현재 작업 폴더를 기준으로 하므로 반드시 프로젝트 폴더에서 실행한다.

## 3. 도구·설정 선택 이유
- Ultralytics: 객체 탐지와 분할을 같은 API로 실행하며 좌표·클래스·점수·마스크를 파일로 저장할 수 있다.
- yolo26n.pt: 과제에서 지정한 nano 탐지 모델. CPU 실행을 위해 사용한다.
- yolo26n-seg.pt: 과제에서 지정한 분할 모델. 대상의 픽셀 경계를 비교하기 위해 사용한다.
- imgsz=640: 과제에서 지정한 추론 크기. 내부 리사이즈·패딩이 적용될 수 있으며 저장 JSON의 박스는 원본 좌표계이다.
- conf=0.25/0.50: 점수 컷오프만 바꾸어 결과를 비교한다. 점수는 개별 박스가 맞을 확률로 보장되는 값이 아니다.
- retina_masks=True: 저장할 마스크를 원본 해상도에 맞춘다. 저장 직후 PNG를 다시 열어 가로·세로 크기를 확인한다.

## 4. 실행 과정과 산출물
1. 원본 크기와 해시를 기록한다.
2. 탐지 모델을 두 임계값으로 실행한다.
3. 분할 모델을 두 임계값으로 실행한다.
4. 각 실행의 result.jpg와 boxes.json을 저장한다.
5. 분할 객체별 mask_XX.png를 0/255 이진 이미지로 저장한다.
6. 원본 크기·좌표계와 마스크 파일명을 JSON으로 연결한다.
7. 임계값 비교 이미지 두 장과 summary.json, manifest.json을 저장한다.

`참고자료/outputs/yolo/` 아래 detect_0.25, detect_0.50, segment_0.25, segment_0.50에 최초 실행 결과가 있다. Windows 검증 결과는 `참고자료/outputs/windows_verified/`에 있다. 재실행 명령은 `프로그램 파일/outputs/my_run/`에 새 결과를 저장한다. 객체 id는 해당 실행 내부에서만 유효하다. 두 임계값의 id가 같아도 동일 객체라는 보장은 없으므로 클래스와 위치로 대응시킨다.

## 5. 원본 대조 방법
좌표의 원점은 왼쪽 위이며 x는 오른쪽, y는 아래쪽으로 증가한다. xyxy=[x1,y1,x2,y2]는 왼쪽 위와 오른쪽 아래 꼭짓점이다. 결과 이미지에서 버스 박스를 골라 같은 실행의 boxes.json에서 class_name=bus인 항목의 좌표·점수를 확인한다.

박스는 배경을 포함하는 직사각형 영역이고, 분할 마스크는 대상에 속한다고 예측한 픽셀의 집합이다. 버스 앞을 가린 사람, 잘린 좌우 가장자리 사람, 다리·팔 사이 빈 공간, 버스 하단과 도로 경계를 확대하여 원본과 비교한다. 그림자까지 대상에 포함했는지 확인한다. 작은/가려진 대상은 누락될 수 있다.

## 6. 검토 원칙과 한계
정답 박스·정답 마스크를 따로 구축하지 않았으므로 정확도, IoU, precision, recall, mAP 수치를 산출하지 않는다. 객체 수가 줄었다는 사실만으로 성능 향상이라고 결론내리지 않는다. 서로 다른 탐지 모델과 분할 모델의 점수 차이를 임계값 효과로 혼동하지 않는다. 마스크는 실제 대상의 완벽한 윤곽이나 뒤에 가려진 형태를 보장하지 않는다.

원시 JSON과 원시 마스크는 수동으로 고치지 않는다. 발견한 문제·해당 객체·대략적 위치·판단 근거·확인 필요 여부를 REPORT에 분리하여 기록한다. 별도 사진을 추가하면 그 실험의 manifest와 결과도 보관한다.

## 7. 평가 기준 대응
| 기준 | 확인할 파일과 근거 |
|---|---|
| 실행 가능성 25점 | run.py, requirements.txt, 실행 명령, 저장된 결과, manifest.json |
| 원본 대조·근거 25점 | REPORT, 원본 이미지, 객체별 좌표 JSON, 분할 PNG |
| 범위 정직성 25점 | 미실행·미확인 범위와 정답 데이터 부재 명시, 원시 결과 보존 |
| 설명 25점 | 목적, 실행 위치, 모델·설정 선택 이유, 실제 결과와 해석 |

## 8. 제출 방법
GitHub의 `과제_261110_YOLO서비스` 폴더 링크를 제출한다. 이 README에서 실행 코드, 보고서, 결과 이미지를 열 수 있다. 실행하려면 저장소를 내려받은 뒤 해당 과제 폴더에서 위 명령을 실행한다. `.venv/`와 `.yolo_config/`는 업로드하지 않는다. 채점자가 링크를 열어 README와 결과 이미지를 볼 수 있도록 접근 권한을 확인한 뒤 과제 제출란에는 그 링크를 붙여 넣는다. ZIP 다운로드 링크 자체는 강의에서 지정한 GitHub/Drive 제출 링크를 대신하지 않는다. 모델 가중치는 GitHub 용량을 고려해 생략할 수 있으며 최초 실행에서 다시 내려받는다.

공개 서비스 배포 시 Ultralytics의 AGPL-3.0 또는 Enterprise 조건을 확인한다. 본 묶음은 과제 검토용이다.

## 9. 참고
- 강의자료 「노드04_AI가 문서와 사진에서」 7~10쪽: 선택과제 A와 공통 평가 기준.
- https://docs.ultralytics.com/modes/predict/
- https://docs.ultralytics.com/tasks/segment/

## 10. 제출 전 점검 및 설치 목록 안내
requirements.txt는 실행에 필요한 설치 목록이다. requirements-lock.txt는 최초 Linux 실행 환경의 전체 패키지 기록이며 다른 작업용 패키지와 로컬 경로도 포함하므로 설치 명령에 사용하지 않는다. Windows Python 3.11.14에서 실제 추론 네 조건을 재실행하여 정상 종료했다. outputs/windows_verified 및 WINDOWS_RUN_CHECK.txt 참조. 자세한 결과는 SUBMISSION_CHECK.txt를 참조한다.
