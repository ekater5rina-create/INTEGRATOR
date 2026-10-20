(() => {
  'use strict';
  const core = window.BusinessDemo;
  const rubles = cents => (cents / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
  const percent = value => value === null ? '—' : value.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' %';
  const set = (id, value) => { document.getElementById(id).textContent = value; };
  const form = document.getElementById('order-demo');
  const values = () => Object.fromEntries(new FormData(form));
  function refreshCalculator() {
    try {
      const result = core.calculate(values());
      set('calc-error', '');
      for (const key of ['cost', 'revenue', 'profit']) set('calc-' + key, rubles(result[key]));
      set('calc-margin', percent(result.margin));
      set('calc-unit', rubles(result.unitCost));
      set('calc-break-even', rubles(result.breakEvenPrice));
      set('calc-formula', `${result.quantity} × (${rubles(result.material)} + ${rubles(result.labor)}) + ${rubles(result.overhead)} = ${rubles(result.cost)}`);
      set('calc-status', result.profit < 0 ? 'По указанным затратам заказ убыточен' : result.profit === 0 ? 'Выручка покрывает указанные затраты' : 'Выручка покрывает указанные затраты с прибылью');
      document.getElementById('calc-results').dataset.state = result.profit < 0 ? 'loss' : 'profit';
    } catch (error) {
      set('calc-error', error.message);
      for (const key of ['cost', 'revenue', 'profit', 'margin', 'unit', 'break-even']) set('calc-' + key, '—');
      set('calc-formula', 'Введите корректные значения для расчёта.');
      set('calc-status', 'Расчёт не выполнен');
      document.getElementById('calc-results').dataset.state = 'invalid';
    }
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', refreshCalculator);
  form.addEventListener('reset', () => requestAnimationFrame(refreshCalculator));
  document.getElementById('material-scenario').addEventListener('click', () => {
    try {
      const increased = Math.round(core.money(form.elements.material.value) * 1.1);
      if (increased > 100000000) throw new Error('Для сценария уменьшите исходную стоимость материалов');
      form.elements.material.value = (increased / 100).toFixed(2);
      refreshCalculator();
    } catch (error) { set('calc-error', error.message); }
  });
  refreshCalculator();

  const samples = [
    { name: 'demo-orders-1.csv', text: '\uFEFFДата;Заказ;Выручка;Затраты;План выручки\r\n2026-10-01;ДЕМО-101;110000;72000;100000\r\n2026-10-02;ДЕМО-102;85000;61000;90000\r\n' },
    { name: 'demo-orders-2.csv', text: '\uFEFFДата;Заказ;Выручка;Затраты;План выручки\r\n2026-10-03;ДЕМО-103;40000;47000;50000\r\n2026-10-01;ДЕМО-101;110000;72000;100000\r\n2026-10-04;ДЕМО-104;не указано;20000;30000\r\n' }
  ];
  let uploadVersion = 0;
  function renderReport(files) {
    const result = core.summarize(files);
    const output = document.getElementById('report-results');
    output.hidden = false;
    set('report-count', String(result.accepted.length));
    for (const key of ['revenue', 'cost', 'plan', 'profit']) set('report-' + key, result.accepted.length ? rubles(result[key]) : '—');
    set('report-variance', result.accepted.length ? rubles(result.variance) + ' / ' + percent(result.variancePercent) : '—');
    set('report-files', files.map(file => file.name).join(', '));
    set('report-summary', result.accepted.length ? `Принято записей: ${result.accepted.length}. Исключено строк или файлов: ${result.errors.length}. Предупреждений: ${result.warnings.length}.` : 'Нет корректных записей. Исправьте ошибки и загрузите файлы повторно.');
    const body = document.getElementById('report-body'); body.replaceChildren();
    result.accepted.slice(0, 50).forEach(row => {
      const tr = document.createElement('tr');
      [row.date, row.order, rubles(row.revenue), rubles(row.cost), rubles(row.revenue - row.cost)].forEach(value => {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      });
      body.append(tr);
    });
    set('report-truncation', result.accepted.length > 50 ? 'Показаны первые 50 записей. Итоги рассчитаны по всем принятым записям.' : 'Итоги рассчитаны только по принятым записям. Отклонение: факт выручки минус план; процент — от плана.');
    const issues = document.getElementById('report-issues'); issues.replaceChildren();
    [...result.errors, ...result.warnings].slice(0, 20).forEach(message => {
      const item = document.createElement('li'); item.textContent = message; issues.append(item);
    });
    if (result.errors.length + result.warnings.length > 20) {
      const item = document.createElement('li'); item.textContent = 'Показаны первые 20 замечаний.'; issues.append(item);
    }
  }
  document.getElementById('sample-report').addEventListener('click', () => {
    uploadVersion++;
    document.getElementById('report-upload').value = '';
    set('report-error', ''); renderReport(samples);
  });
  document.getElementById('report-upload').addEventListener('change', async event => {
    const version = ++uploadVersion;
    const files = Array.from(event.target.files);
    document.getElementById('report-results').hidden = true;
    if (!files.length) { set('report-error', ''); return; }
    try {
      if (files.length > 5) throw new Error('Выберите не больше 5 файлов');
      if (files.some(file => !file.name.toLowerCase().endsWith('.csv'))) throw new Error('В этом демо поддерживается только CSV');
      if (files.reduce((sum,file) => sum + file.size, 0) > 2 * 1024 * 1024) throw new Error('Общий размер файлов — не больше 2 МБ');
      set('report-error', 'Читаю файлы…');
      const decoded = await Promise.all(files.map(async file => ({ name: file.name, text: new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()) })));
      if (version !== uploadVersion) return;
      renderReport(decoded); set('report-error', '');
    } catch (error) {
      if (version !== uploadVersion) return;
      set('report-error', error instanceof TypeError ? 'Не удалось прочитать текст. Сохраните CSV в кодировке UTF-8.' : error.message);
    }
  });
  document.querySelectorAll('[data-report-download]').forEach(link => {
    const sample = samples[Number(link.dataset.reportDownload)];
    link.href = URL.createObjectURL(new Blob([sample.text], { type: 'text/csv;charset=utf-8' }));
    link.download = sample.name;
  });
})();
