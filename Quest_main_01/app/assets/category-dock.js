(function(){'use strict';
if(!document.querySelector('link[href$="category-dock.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('category-dock.css',document.currentScript.src);document.head.append(l)}
let dock,scheduled=false;
function update(){scheduled=false;const body=document.getElementById('itemYearRows');let host,table,groups=[];
if(body){host=body.closest('.panel');table=body.closest('table');groups=[...body.querySelectorAll('.matrix-category-total')].map(row=>({row,name:row.querySelector('.matrix-category').textContent.trim()}))}
else{host=[...document.querySelectorAll('main>section')].find(s=>s.querySelector('h2')?.textContent==='항목 × 연도별 결과');if(host){table=host.querySelector('table');groups=[...host.querySelectorAll('table:not(.report-grand-table)')].map(t=>({row:t.tBodies[0].rows[0],name:t.parentElement.previousElementSibling?.textContent||''}))}}
if(!dock){dock=document.createElement('div');dock.className='category-dock';dock.setAttribute('aria-label','지나온 카테고리 확인분 소계');document.body.append(dock)}
if(!host||!table||!host.getClientRects().length){dock.hidden=true;return}
const top=Math.max(0,(document.querySelector('.app-top')||document.querySelector('body>header'))?.getBoundingClientRect().bottom||0),rect=table.getBoundingClientRect();
const atBottom=scrollY+innerHeight>=document.documentElement.scrollHeight-3;
const passed=groups.filter(g=>atBottom||g.row.getBoundingClientRect().top<top+36);
if(!passed.length||rect.top>top){dock.hidden=true;return}
dock.hidden=false;dock.style.top=Math.max(0,top)+'px';dock.style.left=rect.left+'px';dock.style.width=rect.width+'px';
const grand=body?body.querySelector('.matrix-grand-total'):host.querySelector('.report-grand-table tbody tr');
const widths=[...table.tHead.rows[0].cells].map(c=>c.getBoundingClientRect().width);
const signature=widths.join(',')+(grand?.textContent||'')+passed.map(g=>g.name+g.row.textContent).join('|');if(dock.dataset.signature===signature)return;dock.dataset.signature=signature;
const copy=document.createElement('table');copy.className=table.className;copy.append(table.tHead.cloneNode(true));
[...copy.tHead.rows[0].cells].forEach((c,i)=>c.style.setProperty('width',widths[i]+'px','important'));
const tbody=document.createElement('tbody');
if(grand){const row=grand.cloneNode(true);row.classList.add('matrix-grand-total');row.querySelectorAll('button').forEach(b=>{const s=document.createElement('span');s.textContent=b.textContent;b.replaceWith(s)});tbody.append(row)}
for(const g of passed){const row=g.row.cloneNode(true);row.querySelectorAll('[rowspan]').forEach(c=>c.removeAttribute('rowspan'));row.querySelectorAll('button').forEach(b=>{const span=document.createElement('span');span.textContent=b.textContent;b.replaceWith(span)});row.querySelectorAll('.vertical-category').forEach(s=>s.className='');if(!body)row.cells[0].textContent=g.name;tbody.append(row)}tbody.querySelectorAll('td,th').forEach(c=>c.style.setProperty('display','table-cell','important'));copy.append(tbody);dock.replaceChildren(copy)}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update)}}window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);window.addEventListener('hashchange',schedule);
const body=document.getElementById('itemYearRows');if(body)new MutationObserver(()=>{if(dock)dock.dataset.signature='';schedule()}).observe(body,{childList:true});schedule();
})();
