"""Rebuild reviewed CSV/Markdown from explicit manual review, retaining OCR references."""
from pathlib import Path
import csv,json


def main(root=None):
    r=Path(root) if root is not None else Path(__file__).resolve().parent
    o=r.parent/'참고자료/outputs/ocr'
    o.mkdir(parents=True,exist_ok=True)
    data=json.loads((r/'reviewed_cells.json').read_text(encoding='utf-8'))
    raw=json.loads((o/'text_coordinates.json').read_text(encoding='utf-8'))
    fields=['area','gross_area_sq_miles','population','population_year','notes']
    with (o/'table.csv').open('w',encoding='utf-8-sig',newline='') as f:
     w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows({k:x[k] for k in fields} for x in data)
    lines=['# Table 1 - Population of the United States and of its outlying possessions','',
    '출처: U.S. Census Bureau, 1910 Census, Volume I (1913), PDF 2쪽 / 인쇄 22쪽.',
    '원문: https://www2.census.gov/library/publications/decennial/1910/volume-1/volume-1-p3.pdf','',
    '면적 단위는 육지와 수면을 합한 제곱마일이다. 인구 열의 원문 제목은 Population: 1910이나 각주가 있는 행의 연도는 별도 보존했다. 역사적 지명 Porto Rico도 원문 표기를 유지했다.',
    '','| Area | Gross area (sq mi) | Population | Year | Notes |','|---|---:|---:|---:|---|']
    log=[]
    for x in data:
     area=x['gross_area_sq_miles'];pop=x['population']
     lines.append(f"| {x['area']} | {format(area,',') if area is not None else '—'} | {pop:,} | {x['population_year']} | {x['notes']} |")
     for col,(lo,hi) in {'area':(0,680),'gross_area_sq_miles':(680,870),'population':(870,1085)}.items():
      y=x['y_center'];items=[]
      for q in raw:
       pts=q['polygon'];cx=sum(p[0] for p in pts)/len(pts);cy=sum(p[1] for p in pts)/len(pts)
       if lo<=cx<hi and abs(cy-y)<x.get('y_tolerance',10):items.append(q)
      log.append({'row':x['area'],'column':col,'source_bbox':f'{lo},{y-11},{hi},{y+11}','raw_ids':';'.join(str(q['id']) for q in items),'raw_text':' | '.join(q['text'] for q in items),'reviewed_value':'' if x[col] is None else x[col],'review_status':'source-image visually checked','reason':x.get('review_note','원본 행·열과 대조. 숫자의 쉼표·공백을 제거해 CSV에 저장.'),'needs_check':False})
    lines+=['','## 원본 대조 및 확인 필요',
    '- 11개 데이터 행의 지명·면적·인구를 원본 표와 대조하였다. OCR 원시 결과는 수정하지 않았다.',
    '- Military and naval service abroad의 면적 칸은 원문에서 수치 대신 점선으로 표시된다. CSV는 빈 값(null 의미)으로 두며 0으로 대체하지 않았다.',
    '- Philippine Islands의 인구 7,635,426 앞의 위첨자 1은 숫자의 일부가 아닌 각주이다. 연도 1903을 별도 열로 기록했다.',
    '- Panama Canal Zone의 인구 62,810 앞의 위첨자 2는 각주이다. 연도 1912를 별도 열로 기록했다.',
    '- Guam 및 Samoa의 인구는 원문에서 estimated라고 표시된다. 추정치라는 성격을 notes에 보존했다.',
    '- 각주에서 이미 설명된 예외 외에 판독 불가로 남긴 데이터 셀은 없다. 역사 자료의 실제 통계 정확도는 별도로 검증하지 않았다.',
    '- 자동 원시 OCR과 검토 후 값의 대응은 review_log.csv의 행·열·좌표·raw_ids를 따라 확인한다.',
    '- 합계 행과 하위 행이 함께 있으므로 모든 행을 단순 합산하면 중복 계산된다. 표는 계층 구조를 notes에 기록했다.','']
    (o/'document.md').write_text('\n'.join(lines),encoding='utf-8')
    with (o/'review_log.csv').open('w',encoding='utf-8-sig',newline='') as f:
     w=csv.DictWriter(f,fieldnames=list(log[0]));w.writeheader();w.writerows(log)
    print('saved 11 rows; 33 source-linked review records')


if __name__ == "__main__":
    main()
