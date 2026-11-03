export function askPdfRange(){return new Promise(resolve=>{
 document.querySelector('#pdf-range-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='pdf-range-dialog';dialog.setAttribute('aria-labelledby','pdf-range-title');
 dialog.innerHTML='<form><div class="section-title"><h2 id="pdf-range-title">PDF 읽을 페이지</h2><button type="button" aria-label="PDF 첨부 취소">×</button></div><p>한 번에 최대 10쪽을 읽습니다. 나머지는 페이지 범위를 바꿔 다시 첨부하세요.</p><div class="columns"><label>시작 페이지<input type="number" name="from" min="1" max="100000" value="1" required></label><label>끝 페이지<input type="number" name="to" min="1" max="100000" value="10" required></label></div><p role="alert"></p><button>읽기</button></form>';
 document.querySelector('.shell').append(dialog);let selection=null;
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const from=Number(e.target.elements.from.value),to=Number(e.target.elements.to.value);if(to<from||to-from>=10){dialog.querySelector('[role=alert]').textContent='시작~끝 페이지를 최대 10쪽으로 지정하세요.';return;}selection={pageFrom:from,pageTo:to};dialog.close();};
 dialog.querySelector('[type=button]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();resolve(selection);},{once:true});dialog.showModal();dialog.querySelector('input').focus();
});}
