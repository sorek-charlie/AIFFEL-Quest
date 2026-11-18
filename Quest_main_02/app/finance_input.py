"""Extract financial accounts conservatively from user-supplied files.

Amounts are normalized to integer KRW. Conflicts and unlabelled units are never
silently guessed. Page/sheet references are retained with each value.
"""
import csv
import datetime as dt
import io
import re
import zipfile
from decimal import Decimal, InvalidOperation
from pathlib import Path

ALIASES={
 'assets':['자산','자산총계','자산합계'], 'current_assets':['유동자산','유동자산합계'],
 'noncurrent_assets':['비유동자산','비유동자산합계'], 'cash':['현금및현금성자산','현금과현금성자산'],
 'receivables':['매출채권','매출채권및기타채권'], 'inventory':['재고자산','재고자산합계'],
 'liabilities':['부채','부채총계','부채합계'], 'current_liabilities':['유동부채','유동부채합계'],
 'short_debt':['단기차입금'], 'long_debt':['장기차입금'], 'related_long_debt':['특수관계자장기차입금'], 'other_long_debt':['기타장기차입금'], 'payables':['매입채무'], 'equity':['자본','자본총계','자본합계'],
 'capital':['자본금'], 'sales':['매출액','매출','영업수익'], 'cost_of_sales':['매출원가'],
 'gross_profit':['매출총이익','매출총이익손실'], 'selling_admin':['판매비와관리비','판매비및관리비','판관비'],
 'operating_profit':['영업이익','영업이익손실','영업손익'], 'net_profit':['당기순이익','당기순이익순손실','당기순손익'],
 'interest':['이자비용'], 'pretax':['법인세비용차감전순손익','법인세비용차감전순이익','세전순이익'],
 'income_tax':['법인세비용','법인세'],
}
LABELS={'assets':'자산총계','current_assets':'유동자산','noncurrent_assets':'비유동자산','cash':'현금및현금성자산','receivables':'매출채권','inventory':'재고자산','liabilities':'부채총계','current_liabilities':'유동부채','short_debt':'단기차입금','long_debt':'장기차입금','related_long_debt':'특수관계자 장기차입금','other_long_debt':'기타장기차입금','payables':'매입채무','equity':'자본총계','capital':'자본금','sales':'매출액','cost_of_sales':'매출원가','gross_profit':'매출총이익','selling_admin':'판매비와관리비','operating_profit':'영업이익','net_profit':'당기순이익','interest':'이자비용','pretax':'세전이익','income_tax':'법인세비용'}
UNITS={'원':1,'천원':1000,'백만원':1000000,'억원':100000000}
MAX_ZIP_UNCOMPRESSED_BYTES=100_000_000

def normalize_label(value):
    return re.sub(r'[^가-힣a-z0-9]','',str(value or '').lower()).replace('계정과목','')

LOOKUP={normalize_label(alias):key for key,aliases in ALIASES.items() for alias in aliases}

def parse_year(value,today=None):
    if value is None or isinstance(value,bool):return None
    today=today or dt.date.today()
    if isinstance(value,(dt.datetime,dt.date)):
        date=value.date() if isinstance(value,dt.datetime) else value
        if date.month!=12 or date.day!=31 or date>today:return None
        return date.year
    text=str(value).strip()
    if re.search(r'예상|추정|전망|계획|목표|상반기|하반기|분기|반기|CAGR|예산',text,re.I):return None
    match=re.fullmatch(r'(20\d{2})(?:\s*(?:[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})|년(?:도)?))?',text)
    if not match:
        # Accept common fiscal-period labels only when they contain a single
        # unambiguous year; never infer a year from a range or forecast label.
        found=re.findall(r'(?<!\d)(20\d{2})(?!\d)',text)
        if len(found)!=1:return None
        date_match=re.search(r'(20\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})',text)
        if date_match:
            if int(date_match.group(2))!=12 or int(date_match.group(3))!=31:return None
            return int(found[0]) if dt.date(int(found[0]),12,31)<=today else None
        year=int(found[0]);return year if year<today.year else None
    year=int(match.group(1));month=int(match.group(2)) if match.group(2) else None;day=int(match.group(3)) if match.group(3) else None
    if month is not None and (month!=12 or day!=31 or dt.date(year,12,31)>today):return None
    if month is None and year>=today.year:return None
    return year

def number(value,scale):
    if value is None or isinstance(value,bool):return None
    text=str(value).strip().replace(',','').replace(' ','')
    if text in ('','-','―','—','–','n/a','N/A'):return None
    if text.startswith('(') and text.endswith(')'):text='-'+text[1:-1]
    if not re.fullmatch(r'-?\d+(?:\.\d+)?',text):return None
    try:value=Decimal(text)*scale
    except InvalidOperation:return None
    if value!=value.to_integral_value():raise ValueError('금액 단위가 원 미만이어서 정확히 변환할 수 없습니다.')
    if abs(value)>Decimal('9007199254740991'):raise ValueError('금액이 보고서의 정확한 정수 처리 범위를 초과합니다.')
    return int(value)

def detect_unit(rows,override):
    if override in UNITS:return override
    found=set()
    for row in rows[:20]:
        text=' '.join(str(x or '') for x in row)
        for match in re.finditer(r'단위\s*[:：]?\s*(억원|백만원|천원|원)',text):found.add(match.group(1))
    if len(found)==1:return found.pop()
    if len(found)>1:raise ValueError('한 자료에 여러 금액 단위가 표시되어 단위를 확인해야 합니다.')
    raise ValueError('금액 단위를 찾지 못했습니다. 원자료에 금액 단위를 표시한 뒤 다시 첨부하세요.')

def table_values(rows,source,override,today=None):
    candidates=[]; unit=None; header=None
    for index,row in enumerate(rows):
        years={col:parse_year(value,today) for col,value in enumerate(row)}
        years={col:year for col,year in years.items() if year}
        nearby=rows[max(0,index-2):min(len(rows),index+3)]
        anchor=any(re.sub(r'\s+', '', str(value or '')) in ('계정명','계정과목','과목','구분','항목')
                   for nearby_row in nearby for value in nearby_row)
        if years and anchor and not any(normalize_label(value) in LOOKUP for value in row):
            header=years
            continue
        if not header:continue
        for col,value in enumerate(row):
            key=LOOKUP.get(normalize_label(value))
            if not key or col>=min(header):continue
            if unit is None:unit=detect_unit(rows,override)
            for j,year in header.items():
                if j>=len(row):continue
                val=number(row[j],UNITS[unit])
                if val is not None:candidates.append((year,key,val,f'{source} · {index+1}행 {j+1}열',unit,source,int('*' in str(value))))
            break
    return candidates

def spreadsheet(raw,ext,name,override):
    tables=[]
    if ext in ('.xlsx','.xlsm'):
        from openpyxl import load_workbook
        try:book=load_workbook(io.BytesIO(raw),read_only=True,data_only=True,keep_links=False)
        except Exception as exc:raise ValueError('엑셀 파일을 열지 못했습니다.') from exc
        try:
            for sheet in book.worksheets:
                if sheet.max_row>10000 or sheet.max_column>150:raise ValueError('엑셀 시트 크기 제한을 초과했습니다.')
                rows=[list(r) for r in sheet.iter_rows(values_only=True)]
                tables.extend(table_values(rows,f'{name} · 시트 {sheet.title}',override))
        finally:book.close()
    elif ext=='.xls':
        import xlrd
        try:book=xlrd.open_workbook(file_contents=raw)
        except Exception as exc:raise ValueError('구형 엑셀 파일을 열지 못했습니다.') from exc
        for sheet in book.sheets():
            if sheet.nrows>10000 or sheet.ncols>150:raise ValueError('엑셀 시트 크기 제한을 초과했습니다.')
            rows=[sheet.row_values(i) for i in range(sheet.nrows)]
            tables.extend(table_values(rows,f'{name} · 시트 {sheet.name}',override))
    else:
        for enc in ('utf-8-sig','cp949'):
            try:text=raw.decode(enc);break
            except UnicodeDecodeError:continue
        else:raise ValueError('CSV 인코딩을 확인하세요.')
        tables.extend(table_values(list(csv.reader(io.StringIO(text))),name,override))
    return tables

def pdf(raw,name,override):
    import pymupdf
    try:doc=pymupdf.open(stream=raw,filetype='pdf')
    except Exception as exc:raise ValueError('재무 PDF를 열지 못했습니다.') from exc
    result=[]
    with doc:
        if doc.needs_pass or len(doc)>100:raise ValueError('암호화된 PDF 또는 100쪽 초과 자료는 처리할 수 없습니다.')
        # Detailed statements often use a vertical PDF reading order, with one
        # account followed by one value per year. Prefer explicitly titled
        # statements over rounded summary tables elsewhere in the document.
        section=None;section_unit=None;detailed=[]
        balance_keys={'assets','current_assets','noncurrent_assets','cash','receivables','inventory','liabilities','current_liabilities','short_debt','long_debt','related_long_debt','other_long_debt','payables','equity','capital'}
        for index,page in enumerate(doc):
            lines=[x.strip() for x in page.get_text().splitlines() if x.strip()]
            if '재무상태표' in lines:section='balance'
            elif '손익계산서' in lines or '포괄손익계산서' in lines:section='income'
            elif '현금흐름표' in lines or '자본변동표' in lines:section=None
            if not section or '계정명' not in lines:continue
            unit_hit=re.search(r'단위\s*[:：]?\s*(억원|백만원|천원|원)',' '.join(lines[:30]))
            if unit_hit:section_unit=unit_hit.group(1)
            chosen_unit=override if override in UNITS else section_unit
            if not chosen_unit:continue
            head=lines.index('계정명');years=[]
            for item in lines[head+1:head+10]:
                year=parse_year(item)
                if year:years.append(year)
                elif years:break
            if len(years)<2:continue
            for i,line in enumerate(lines):
                key=LOOKUP.get(normalize_label(line))
                if not key or (section=='balance')!=(key in balance_keys):continue
                values=lines[i+1:i+1+len(years)]
                if len(values)!=len(years):continue
                for year,item in zip(years,values):
                    value=number(item,UNITS[chosen_unit])
                    if value is not None:
                        source=f'{name} · {index+1}쪽'
                        detailed.append((year,key,value,source,chosen_unit,source,int('*' in line)))
        if detailed:return detailed
        for index,page in enumerate(doc):
            text=page.get_text()
            if not text.strip():
                try:tp=page.get_textpage_ocr(language='kor+eng',dpi=200,full=True,tessdata=pymupdf.get_tessdata());words=page.get_text('words',textpage=tp)
                except Exception as exc:raise ValueError(f'{name} {index+1}쪽 OCR에 실패했습니다.') from exc
                # OCR text is used for a conservative line-based table; verify on screen.
                lines={}
                for x0,y0,x1,y1,word,*_ in words:lines.setdefault(round(y0/5)*5,[]).append((x0,word))
                text='\n'.join('  '.join(w for _,w in sorted(line)) for _,line in sorted(lines.items()))
            source=f'{name} · {index+1}쪽'
            page_unit=override
            if page_unit not in UNITS:
                hit=re.search(r'단위\s*[:：]?\s*(억원|백만원|천원|원)',text)
                if hit:page_unit=hit.group(1)
            try:
                tables=page.find_tables()
                for table in tables.tables:
                    rows=table.extract()
                    if rows:result.extend(table_values(rows,source,page_unit))
            except (ValueError,AttributeError,TypeError):pass
            # When text is laid out in a single reading stream, identify a heading
            # and map adjacent values only when the year order is explicit.
            lines=[x.strip() for x in text.splitlines() if x.strip()]
            for i,line in enumerate(lines):
                year_tokens=re.findall(r'(?<!\d)20\d{2}(?:[-./]12[-./]31|년)?(?!\d)',line)
                years=[parse_year(x) for x in year_tokens];years=[x for x in years if x]
                if len(set(years))<2:continue
                rows=[['계정명']+years]
                for following in lines[i+1:i+80]:
                    parts=re.split(r'\s{2,}|\t',following)
                    if len(parts)>1:rows.append(parts)
                if len(rows)>1:
                    try:result.extend(table_values(rows,source,page_unit))
                    except ValueError:pass
                break
    return result

def add_pdf_context(name, raw, context):
    import pymupdf

    with pymupdf.open(stream=raw, filetype='pdf') as document:
        first = re.sub(r'\s+', '', document[0].get_text()) if len(document) else ''
        if '부가가치세과세표준증명' in first and '단위:원' in first:
            date = r'20\d{2}/\d{2}/\d{2}'
            amount = r'-?\d[\d,]*'
            record = rf'^({date})\s+({date})\s+({amount})\s+({amount})\s+({amount})\s+({amount})$'
            for index, page in enumerate(document, 1):
                for start, end, total, taxable, exempt, tax in re.findall(record, page.get_text(), re.MULTILINE):
                    total, taxable, exempt, tax = (number(value, 1) for value in (total, taxable, exempt, tax))
                    try:
                        start, end = (dt.date.fromisoformat(value.replace('/', '-')) for value in (start, end))
                    except ValueError:
                        continue
                    if start <= end and total == taxable + exempt:
                        key = start.isoformat(), end.isoformat()
                        value = {'start': key[0], 'end': key[1], 'total': total, 'tax': tax,
                                 'source': f'{name} · {index}쪽 · 원'}
                        periods = context.setdefault('vat_periods', {})
                        if key not in periods:
                            periods[key] = value
                        elif periods[key] and (periods[key]['total'], periods[key]['tax']) != (total, tax):
                            periods[key] = None
            return
        if '기업종합보고서' not in first:
            return

        def add(key, value):
            context.setdefault('company_profile', {}).setdefault(key, {
                'value': value, 'source': f'{name} · {index}쪽',
            })

        for index, page in enumerate(document, 1):
            lines = [line.strip() for line in page.get_text().splitlines() if line.strip()]
            fields = {'설립년월': ('founded', r'\d{4}-\d{2}-\d{2}'),
                      '종업원수': ('employees', r'\d[\d,]*\s*명'),
                      '기업규모': ('size', r'(?:소기업|중기업|중견기업|대기업)'),
                      '주요제품(상품)': ('products', r'.{2,60}'),
                      '표준산업분류(11차)': ('industry', r'\([A-Z]\d{5}\).{2,65}')}
            for raw_label, (key, definition) in fields.items():
                if raw_label in lines:
                    at = lines.index(raw_label)
                    if at + 1 < len(lines) and re.fullmatch(definition, lines[at + 1]):
                        add(key, lines[at + 1])
            if '사업장현황' in lines and '본사' in lines:
                add('office', '본사 사업장 확인')
            if '기업인증' in lines and '벤처' in lines:
                start = lines.index('기업인증') + 1
                end = start
                while end < len(lines) and lines[end] not in ('인증', '미인증'):
                    end += 1
                labels = lines[start:end]
                statuses = lines[end:end + len(labels)]
                if labels and len(statuses) == len(labels) and set(statuses) <= {'인증', '미인증'}:
                    certified = [label for label, status in zip(labels, statuses) if status == '인증']
                    add('certifications', ', '.join(certified) if certified else '표에 기재된 항목 모두 미인증')
            if '매출액구성비(%)' in lines:
                at = lines.index('매출액구성비(%)')
                sector = lines[at + 1:at + 4]
                if len(sector) == 3 and re.fullmatch(r'\d{1,3}(?:\.\d+)?', sector[2]):
                    share = Decimal(sector[2])
                    if 0 <= share <= 100:
                        add('sales_channel', f'{sector[0]} · {sector[1]} · 매출 구성비 {share}%')


def add_workbook_context(name, raw, context):
    from openpyxl import load_workbook

    workbook = load_workbook(io.BytesIO(raw), data_only=True, read_only=True, keep_links=False)
    try:
        for sheet in workbook:
            rows = sheet.values
            first = next(rows, ())
            header = next(rows, ())
            keys = {normalize_label(value): pos for pos, value in enumerate(header) if value}
            if '계정명' in keys and any(re.fullmatch(r'\s*단위\s*[:：]?\s*%\s*', str(value)) for value in first):
                account = keys['계정명']
                year_columns = {column: str(value)[:4] for column, value in enumerate(header)
                                if re.fullmatch(r'20\d{2}1231', str(value))}
                allowed = {'매출액증가율', '영업이익증가율', '순이익증가율'}
                for row_no, row in enumerate(rows, 3):
                    label = normalize_label(row[account]) if account < len(row) else ''
                    if label not in allowed:
                        continue
                    for column, year in year_columns.items():
                        raw_value = row[column] if column < len(row) else None
                        if isinstance(raw_value, (float, int)):
                            value = f'{raw_value:.2f}%'
                        elif raw_value in ('적자전환', '흑자전환'):
                            value = raw_value
                        else:
                            continue
                        context.setdefault('growth_indicators', []).append({
                            'year': int(year), 'label': label, 'value': value,
                            'source': f'{name} · {sheet.title} {row_no}행 {column + 1}열 · %',
                        })
                continue
            required = ('금융기관', '대과목', '소과목', '금잔', '만기구조')
            units = [re.fullmatch(r'\s*단위\s*[:：]?\s*(원|천원|백만원|억원)\s*', str(value)) for value in first if value]
            units = {match.group(1) for match in units if match}
            if not all(key in keys for key in required) or len(units) != 1:
                continue
            unit = units.pop()
            maturity = next(rows, ())
            maturity_start = keys['만기구조']
            credit = context.setdefault('credit_facilities', [])
            for row_no, row in enumerate(rows, 4):
                if len(row) <= max(keys.values()):
                    continue
                institution, group, product, amount = (row[keys[key]] for key in required[:4])
                if not institution or not group or not product or '합계' in str(group) + str(product):
                    continue
                total = number(amount, UNITS[unit])
                if total is None:
                    continue
                terms = []
                for bucket, balance in zip(maturity[maturity_start:], row[maturity_start:]):
                    if bucket and balance is not None:
                        value = number(balance, UNITS[unit])
                        if value is not None:
                            terms.append({'term': str(bucket), 'amount': value})
                credit.append({'institution': str(institution), 'product': str(product), 'amount': total,
                               'maturity': terms, 'source': f'{name} · {sheet.title} {row_no}행 · {unit}'})
    finally:
        workbook.close()


def extract_files(files,unit='auto'):
    if not files:raise ValueError('재무 파일을 하나 이상 선택하세요.')
    expanded=[]
    zip_bytes=0
    for name,raw in files:
        name=Path(name).name;ext=Path(name).suffix.lower()
        if not raw or len(raw)>25_000_000:raise ValueError('파일은 각각 25MB 이하여야 합니다.')
        if ext=='.zip':
            try:
                with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                    entries=[x for x in archive.infolist() if not x.is_dir() and Path(x.filename).suffix.lower() in ('.pdf','.xlsx','.xlsm','.xls','.csv')]
                    zip_bytes+=sum(entry.file_size for entry in entries)
                    if zip_bytes>MAX_ZIP_UNCOMPRESSED_BYTES:raise ValueError('압축을 푼 재무자료의 합계가 100MB를 초과합니다.')
                    expanded.extend((Path(x.filename).name,archive.read(x)) for x in entries)
            except zipfile.BadZipFile as exc:raise ValueError('ZIP 파일을 읽지 못했습니다.') from exc
        elif ext in ('.pdf','.xlsx','.xlsm','.xls','.csv'):expanded.append((name,raw))
        else:raise ValueError('PDF, XLSX, XLS, CSV 또는 ZIP 파일을 선택하세요.')
    if not expanded:raise ValueError('분석 가능한 파일이 없습니다.')
    all_values = []
    warnings = []
    context = {}
    seen = set()
    for name, raw in expanded:
        identity = (name, raw)
        if identity in seen:
            continue
        seen.add(identity)
        ext = Path(name).suffix.lower()
        values_found = pdf(raw, name, unit) if ext == '.pdf' else spreadsheet(raw, ext, name, unit)
        if ext == '.pdf':
            add_pdf_context(name, raw, context)
        elif ext in ('.xlsx', '.xlsm'):
            add_workbook_context(name, raw, context)
        if values_found:
            all_values.extend(values_found)
            continue
        sources_found = [record['source'] for record in context.get('vat_periods', {}).values() if record]
        for key in ('credit_facilities', 'growth_indicators'):
            sources_found.extend(record['source'] for record in context.get(key, []))
        if not any(source.startswith(name + ' ·') for source in sources_found):
            warnings.append(f'{name}: 연간 재무계정 표를 찾지 못했습니다.')
    values={};sources={};origins={};priorities={};conflicts=[]
    for year,key,value,source,original_unit,origin,priority in all_values:
        k=(year,key)
        if k in values and values[k]!=value:
            if origins[k]==origin and priority!=priorities[k]:
                if priority<priorities[k]:continue
            else:
                conflicts.append(f'{year}년 {LABELS[key]}: 서로 다른 값이 있습니다. ({sources[k]} / {source})')
                continue
        values[k]=value;sources[k]=source+f' · 원단위 {original_unit}';origins[k]=origin;priorities[k]=priority
    if conflicts:raise ValueError('자료 간 금액이 일치하지 않습니다. '+conflicts[0])
    years=sorted({y for y,_ in values})[-3:]
    if not years:raise ValueError('연도와 계정과목을 확인할 수 없습니다. 표의 연도·단위와 PDF OCR 결과를 확인하세요.')
    rows=[]
    for year in years:
        row={'year':year,**{key:values.get((year,key)) for key in LABELS}}
        checks={}
        for key,a,b,c in [('balance','assets','liabilities','equity'),('gross','sales','cost_of_sales','gross_profit'),('operating','gross_profit','selling_admin','operating_profit')]:
            x,y,z=(row[a],row[b],row[c])
            checks[key]=None if None in (x,y,z) else (x==y+z if key=='balance' else x-y==z)
        row['checks']=checks;rows.append(row)
    provenance={str(y):{key:sources[(y,key)] for key in LABELS if (y,key) in sources} for y in years}
    vat = context.pop('vat_periods', {})
    if any(record is None for record in vat.values()):
        warnings.append('같은 기간의 부가가치세 자료에 서로 다른 값이 있어 대조가 필요합니다.')
    context['vat_periods'] = [record for _, record in sorted(vat.items()) if record is not None]
    context['sales_history'] = [
        {'year': year, 'amount': value, 'source': sources[(year, key)]}
        for (year, key), value in sorted(values.items()) if key == 'sales'
    ]
    return {'rows': rows, 'sources': provenance, 'warnings': warnings, 'unit': '원', 'context': context}
