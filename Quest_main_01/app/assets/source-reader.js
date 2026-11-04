/* Local-only ZIP/XLSX/PDF reader. No upload service or remote requests. */
(function(root) {
  'use strict';
  const compact = s => String(s??'').replace(/\s/g,'');
  const xml = s => {
    const d=new DOMParser().parseFromString(s,'application/xml');
    if(d.querySelector('parsererror')) throw Error('엑셀 XML 손상');
    return d;
  };
  const nodes = (d,n) => [...d.getElementsByTagNameNS('*',n)];
  const amount = v => {
    if(v===null||v===undefined||String(v).trim()==='') return null;
    const n=Number(String(v).replace(/,/g,''));
    return Number.isSafeInteger(n)&&n>=0?n:null;
  };
  const digits = s => String(s??'').replace(/\D/g,'');
  async function unzip(buffer) {
    const z=await JSZip.loadAsync(buffer,{checkCRC32:true,decodeFileName:b=>new TextDecoder('euc-kr').decode(b)});
    const entries=Object.values(z.files).filter(f=>!f.dir);
    if(entries.length>250) throw Error('ZIP은 파일 250개까지 지원합니다.');
    let total=0;
    for(const f of entries) {
      total+=f._data?.uncompressedSize||0;
      if(total>100*1024*1024) throw Error('압축 해제 용량은 100MB까지 지원합니다.');
    }
    return z;
  }
  async function workbook(buffer) {
    const z=await unzip(buffer);
    const read=async n=>{const f=z.file(n);if(!f)throw Error('엑셀 구성 누락: '+n);return xml(await f.async('string'))};
    const wb=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels');
    const map=Object.fromEntries(nodes(rels,'Relationship').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
    let strings=[];
    if(z.file('xl/sharedStrings.xml')) strings=nodes(await read('xl/sharedStrings.xml'),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join(''));
    const sheets={};
    for(const sh of nodes(wb,'sheet')) {
      const target=map[sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')];
      const path=target?.startsWith('/')?target.slice(1):'xl/'+target;
      const doc=await read(path.replace(/\/\.\//g,'/'));
      const rows=[];
      for(const row of nodes(doc,'row')) {
        const values=[];
        for(const cell of nodes(row,'c')) {
          const letters=(cell.getAttribute('r')||'A').match(/[A-Z]+/)[0];
          let col=0;for(const c of letters)col=col*26+c.charCodeAt(0)-64;col--;
          const type=cell.getAttribute('t');
          let v=nodes(cell,'v')[0]?.textContent??'';
          if(type==='s')v=strings[+v]??'';
          if(type==='inlineStr')v=nodes(cell,'t').map(t=>t.textContent).join('');
          values[col]=v;
        }
        rows.push(values);
      }
      sheets[sh.getAttribute('name')]=rows;
    }
    return sheets;
  }
  function dateValue(v) {
    if(!v)return null;
    const s=String(v).trim();
    if(/^\d{4,5}(\.0+)?$/.test(s)) return new Date(Date.UTC(1899,11,30)+Number(s)*86400000);
    const n=digits(s);
    if(n.length!==8)return null;
    const d=new Date(Date.UTC(+n.slice(0,4),+n.slice(4,6)-1,+n.slice(6,8)));
    return Number.isNaN(d.valueOf())?null:d;
  }
  function employment(rows,source,officerName='') {
    const head=rows.findIndex(r=>r.some(v=>compact(v)==='고용취득일'));
    if(head<0)throw Error('고용현황 열을 찾을 수 없습니다.');
    const h=rows[head].map(compact),idx=n=>h.indexOf(n);
    for(const name of ['고용취득일','고용상실일','특관인/근로유형','근로자주민번호'])if(idx(name)<0)throw Error('고용현황 필수 열 누락: '+name);
    const annual={},integrated={}, records=rows.slice(head+1).filter(r=>r.some(v=>String(v??'').trim()));
    const good=records.filter(r=>compact(r[idx('특관인/근로유형')])==='근로계약1년이상'&&(!officerName||compact(r[idx('근로자이름')])!==compact(officerName)));
    let invalid=0;
    const parsed=good.map(r=>{
      const id=digits(r[idx('근로자주민번호')]),start=dateValue(r[idx('고용취득일')]),end=dateValue(r[idx('고용상실일')]);
      if(!start||id.length!==13||(r[idx('고용상실일')]&&!end)||(end&&end<start)){invalid++;return null}
      const by=(['1','2','5','6'].includes(id[6])?1900:2000)+Number(id.slice(0,2));
      const birth=new Date(Date.UTC(by,+id.slice(2,4)-1,+id.slice(4,6)));
      return {id,start,end,birth,fixed:compact(r[idx('계약직')])==='예'};
    }).filter(Boolean);
    if(invalid)throw Error('고용일자·식별번호 오류 '+invalid+'행. 원자료를 확인하세요.');
    for(let y=2020;y<=2025;y++) {
      const monthly=[],monthlyYouth=[],monthlyIntegrated=[];
      for(let m=1;m<=12;m++) {
        const day=new Date(Date.UTC(y,m,0)),all=new Set(),young=new Set(),integratedYoung=new Set();
        for(const r of parsed) {
          if(day<r.start||(r.end&&day>=r.end))continue;
          all.add(r.id);
          const age=y-r.birth.getUTCFullYear()-Number(day.getUTCMonth()<r.birth.getUTCMonth()||(day.getUTCMonth()===r.birth.getUTCMonth()&&day.getUTCDate()<r.birth.getUTCDate()));
          if(!r.fixed&&age>=15&&age<=29)young.add(r.id);
          if(!r.fixed&&age>=15&&age<=34)integratedYoung.add(r.id);
        }
        monthly.push(all.size);monthlyYouth.push(young.size);monthlyIntegrated.push(integratedYoung.size);
      }
      const avg=a=>Math.floor(a.reduce((s,n)=>s+n,0)*100/12)/100;
      annual[y]={total:avg(monthly),youth:avg(monthlyYouth),monthly,monthlyYouth};
      integrated[y]={total:avg(monthly),youth:avg(monthlyIntegrated),monthly,monthlyYouth:monthlyIntegrated};
    }
    return {source,annual,integrated,officerName,records:records.length,people:new Set(records.map(r=>digits(r[idx('근로자주민번호')]))).size,
      includedRecords:good.length,excludedShort:records.length-good.length,
      companyId:digits(records[0]?.[idx('관리번호')]).slice(0,10)};
  }
  function summaryTax(sheets,source) {
    const out=[];
    for(const rows of Object.values(sheets)) {
      const hi=rows.findIndex(r=>r.some(v=>/^2025년$/.test(compact(v)))&&r.some(v=>/^2021년$/.test(compact(v))));
      if(hi<0)continue;
      const header=rows[hi];
      const find=(label,col)=>{const r=rows.find(r=>compact(r[1])===label);return r?amount(r[col]):null};
      header.forEach((h,col)=>{
        const m=/^(202[1-5])년$/.exec(compact(h));if(!m)return;
        const year=+m[1],base=find('과세표준',col),calculated=find('산출세액',col),burden=find('총부담세액',col),applied=find('최저한세적용대상공제감면세액',col);
        if([base,calculated,burden,applied].some(n=>n===null))return;
        out.push({year,base,calculated,burden,applied,minimum:Math.floor(base*7/100),source,origin:'summary',
          companyId:digits(rows.find(r=>compact(r[1])==='사업자번호')?.[col]),page:'법인사업자_종합'});
      });
    }
    return out;
  }
  function pdfTax(pages,source) {
    const page=pages.find(p=>compact(p.text).includes('법인세과세표준및세액조정계산서'));
    if(!page)return null;
    const t=compact(page.text),ym=/사업연도(202[1-5])[./]01[./]01/.exec(t);
    if(!ym)throw Error('12월 결산 2021~2025년 신고서만 자동 계산합니다.');
    const get=pattern=>{const m=pattern.exec(t);if(!m)throw Error('신고서 항목 인식 실패 · 세액조정계산서를 확인하세요.');return amount(m[1])};
    const year=+ym[1],base=get(/112과세표준10([\d,]+)\(/),calculated=get(/115산출세액12([\d,]+)116/),
      applied=get(/121최저한세적용대상공제감면세액17([\d,]+)122/),burden=get(/122차감세액18([\d,]+)123/);
    const excluded=get(/123최저한세적용제외공제감면세액19([\d,]+)124/);
    const penalties=get(/124가산세액20([\d,]+)125/);
    if(excluded||penalties)throw Error('최저한세 제외공제·가산세가 있는 신고서입니다. 별도 세액 검토가 필요합니다.');
    const company=/사업자등록번호(\d{3}-\d{2}-\d{5})/.exec(t)||/사업자등록번호(\d{3}-\d{2}-\d{5})/.exec(compact(pages[0]?.text));
    const head=compact(pages[0]?.text),companyName=((/법인명(.+?)전화번호/.exec(head)||[])[1]||'').replace(/^(주식회사)(?=\S)/,'$1 ').replace(/(\S)(주식회사)$/,'$1 $2'),ceo=(/대표자성명(.+?)전자우편/.exec(head)||[])[1]||'';
    const out={year,base,calculated,applied,burden,minimum:Math.floor(base*7/100),source,page:page.page,origin:'pdf',companyId:digits(company?.[1]),companyName,ceo,existingNonEmploymentApplied:applied};
    const filed=pages.find(p=>compact(p.text).includes('통합고용세액공제공제세액계산서')&&compact(p.text).includes('③상시근로자현황'));
    if(filed){
      const t=compact(filed.text),totals=(t.split('⑥상시근로자수')[1]?.split('⑦청년등상시근로자수')[0]||'').match(/\d+\.\d{2}/g),youth=(t.split('⑦청년등상시근로자수')[1]?.split('⑧')[0]||'').match(/\d+\.\d{2}/g);
      if(totals?.length>=3&&youth?.length>=3){
        out.filedIntegrated={};for(const[j,y]of[[1,year-1],[2,year]])out.filedIntegrated[y]={total:+totals[j],youth:+youth[j],source,page:filed.page,filed:true};
        const delta=Math.round((+totals[2]-+totals[1])*100),dy=Math.min(delta,Math.max(0,Math.round((+youth[2]-+youth[1])*100)));
        out.existingEmploymentGenerated=Math.max(0,dy*145000+(delta-dy)*85000);out.existingEmploymentApplied=applied;out.existingNonEmploymentApplied=0;
      }
    }
    return out;
  }
  async function pdfPages(buffer) {
    await root.__pdfReady;await root.__pdfWorkerReady;
    const task=pdfjsLib.getDocument({data:new Uint8Array(buffer),useSystemFonts:true,isEvalSupported:false,disableFontFace:true,verbosity:0});
    const pdf=await task.promise;
    try {
      if(pdf.numPages>200)throw Error('PDF는 200쪽까지 지원합니다.');
      const pages=[];
      for(let i=1;i<=pdf.numPages;i++) {
        const text=await (await pdf.getPage(i)).getTextContent();
        pages.push({page:i,text:text.items.map(v=>v.str).join('\n')});
      }
      return pages;
    } finally {await pdf.destroy()}
  }
  root.SourceReader={unzip,workbook,employment,summaryTax,pdfTax,pdfPages,amount};
})(globalThis);
