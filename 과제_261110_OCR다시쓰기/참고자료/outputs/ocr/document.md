# Table 1 - Population of the United States and of its outlying possessions

출처: U.S. Census Bureau, 1910 Census, Volume I (1913), PDF 2쪽 / 인쇄 22쪽.
원문: https://www2.census.gov/library/publications/decennial/1910/volume-1/volume-1-p3.pdf

면적 단위는 육지와 수면을 합한 제곱마일이다. 인구 열의 원문 제목은 Population: 1910이나 각주가 있는 행의 연도는 별도 보존했다. 역사적 지명 Porto Rico도 원문 표기를 유지했다.

| Area | Gross area (sq mi) | Population | Year | Notes |
|---|---:|---:|---:|---|
| United States, with outlying possessions | 3,743,306 | 101,115,487 | 1910 | Aggregate; includes outlying possessions; year exceptions in component rows |
| United States, exclusive of outlying possessions | 3,026,789 | 91,972,266 | 1910 | Aggregate component |
| Outlying possessions | 716,517 | 9,143,221 | 1910 | Subtotal; includes mixed-year and estimated components |
| Alaska | 590,884 | 64,356 | 1910 | Component of outlying possessions |
| Hawaii | 6,449 | 191,909 | 1910 | Component of outlying possessions |
| Porto Rico | 3,435 | 1,118,012 | 1910 | Historical spelling retained |
| Military and naval service abroad | — | 55,608 | 1910 | Area not supplied in source; not zero |
| Philippine Islands | 115,026 | 7,635,426 | 1903 | Footnote 1: Population in 1903 |
| Panama Canal Zone | 436 | 62,810 | 1912 | Footnote 2: Population in 1912 |
| Guam (population estimated) | 210 | 9,000 | 1910 | Estimated population; table heading year |
| Samoa (population estimated) | 77 | 6,100 | 1910 | Estimated population; table heading year |

## 원본 대조 및 확인 필요
- 11개 데이터 행의 지명·면적·인구를 원본 표와 대조하였다. OCR 원시 결과는 수정하지 않았다.
- Military and naval service abroad의 면적 칸은 원문에서 수치 대신 점선으로 표시된다. CSV는 빈 값(null 의미)으로 두며 0으로 대체하지 않았다.
- Philippine Islands의 인구 7,635,426 앞의 위첨자 1은 숫자의 일부가 아닌 각주이다. 연도 1903을 별도 열로 기록했다.
- Panama Canal Zone의 인구 62,810 앞의 위첨자 2는 각주이다. 연도 1912를 별도 열로 기록했다.
- Guam 및 Samoa의 인구는 원문에서 estimated라고 표시된다. 추정치라는 성격을 notes에 보존했다.
- 각주에서 이미 설명된 예외 외에 판독 불가로 남긴 데이터 셀은 없다. 역사 자료의 실제 통계 정확도는 별도로 검증하지 않았다.
- 자동 원시 OCR과 검토 후 값의 대응은 review_log.csv의 행·열·좌표·raw_ids를 따라 확인한다.
- 합계 행과 하위 행이 함께 있으므로 모든 행을 단순 합산하면 중복 계산된다. 표는 계층 구조를 notes에 기록했다.
