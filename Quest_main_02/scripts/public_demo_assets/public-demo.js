// 공개 데모 표시와 빠른 데모(가상 CSV → 간략보고서 PDF). 실제 프로그램 화면은 바꾸지 않는다.
(() => {
  const quickUrl = '/index.html?view=finance&quick=1';
  const bar = document.createElement('aside');
  bar.className = 'public-demo-bar';
  bar.setAttribute('aria-label', '공개 데모 안내');
  const note = document.createElement('span');
  note.textContent = '공개 데모 · 업무작업실.exe와 같은 화면 · 결과는 데모자료, 발송 기록은 시연용';
  const run = document.createElement('a');
  run.href = quickUrl;
  run.textContent = '빠른 데모 ▶';
  bar.append(note, run);
  const mount = () => document.body.append(bar);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  if (new URLSearchParams(location.search).get('quick') !== '1') return;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async (test, ms = 8000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = test(); if (v) return v; await wait(100); }
    throw new Error('빠른 데모 준비 시간이 초과되었습니다.');
  };
  window.addEventListener('load', async () => {
    try {
      const brief = await until(() => document.querySelector('[data-type="brief"]'));
      brief.click();
      const company = await until(() => document.getElementById('finance-company'));
      company.value = '예시전자';
      company.dispatchEvent(new Event('input', {bubbles: true}));
      const response = await fetch('/examples/finance-demo.csv');
      if (!response.ok) throw new Error('데모 데이터를 불러오지 못했습니다.');
      const file = new File([await response.blob()], 'finance-demo.csv', {type: 'text/csv'});
      const input = document.getElementById('finance-zip');
      const files = new DataTransfer();
      files.items.add(file);
      input.files = files.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
      await wait(400);
      document.getElementById('finance-generate').click();
    } catch (error) {
      note.textContent = '빠른 데모를 시작하지 못했습니다. 빠른 데모를 다시 눌러 주세요.';
    }
  });
})();
