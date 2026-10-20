(function (root) {
  'use strict';
  const HEADERS = ['Дата', 'Заказ', 'Выручка', 'Затраты', 'План выручки'];
  function money(value) {
    const text = String(value).trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Сумма должна быть неотрицательным числом с точностью до копеек');
    const [whole, fraction = ''] = text.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(cents) || cents > 100000000) throw new Error('Сумма должна быть не больше 1 000 000 рублей');
    return cents;
  }
  function calculate(values) {
    const quantity = Number(values.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) throw new Error('Объём: целое число от 1 до 1 000 000');
    const material = money(values.material), labor = money(values.labor);
    const overhead = money(values.overhead), price = money(values.price);
    // Amounts stay in integer kopecks until presentation; overhead belongs to the entire order.
    const cost = quantity * (material + labor) + overhead;
    const revenue = quantity * price;
    const profit = revenue - cost;
    return { quantity, material, labor, overhead, price, cost, revenue, profit,
      margin: revenue === 0 ? null : profit / revenue * 100,
      unitCost: cost / quantity, breakEvenPrice: Math.ceil(cost / quantity) };
  }
  function parseCSV(source) {
    const text = source.replace(/^\uFEFF/, '');
    const firstLine = text.split(/\r?\n/)[0];
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    const rows = []; let row = [], cell = '', quoted = false, closedQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (char === '"') { quoted = false; closedQuote = true; }
        else cell += char;
      } else if (char === '"') {
        if (cell !== '' || closedQuote) throw new Error('Некорректные кавычки в CSV');
        quoted = true;
      } else if (char === delimiter || char === '\n' || char === '\r') {
        row.push(cell); cell = ''; closedQuote = false;
        if (char !== delimiter) {
          if (row.some(value => value.trim() !== '')) rows.push(row);
          row = [];
          if (char === '\r' && text[i + 1] === '\n') i++;
        }
      } else {
        if (closedQuote) throw new Error('Лишние символы после закрывающей кавычки');
        cell += char;
      }
    }
    if (quoted) throw new Error('Не закрыты кавычки в CSV');
    row.push(cell);
    if (row.some(value => value.trim() !== '')) rows.push(row);
    return rows;
  }
  function validDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(text + 'T00:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
  }
  function summarize(files) {
    if (!files.length || files.length > 5) throw new Error('Выберите от 1 до 5 CSV-файлов');
    const accepted = [], errors = [], warnings = [], seen = new Set();
    let processed = 0;
    for (const file of files) {
      let rows;
      try { rows = parseCSV(file.text); }
      catch (error) { errors.push(file.name + ': ' + error.message); continue; }
      if (!rows.length || rows[0].map(x => x.trim()).join('|') !== HEADERS.join('|')) {
        errors.push(file.name + ': нужны столбцы «' + HEADERS.join('; ') + '» в этом порядке'); continue;
      }
      for (let i = 1; i < rows.length; i++) {
        if (++processed > 10000) throw new Error('Для демо допустимо не больше 10 000 строк суммарно');
        const label = file.name + ', запись ' + (i + 1);
        try {
          if (rows[i].length !== 5) throw new Error('Должно быть 5 столбцов');
          const [date, order, rawRevenue, rawCost, rawPlan] = rows[i].map(x => x.trim());
          if (!validDate(date)) throw new Error('Неверная дата: используйте ГГГГ-ММ-ДД');
          if (!order || order.length > 100) throw new Error('Укажите заказ длиной до 100 символов');
          const revenue = money(rawRevenue), cost = money(rawCost), plan = money(rawPlan);
          const key = date + '|' + order;
          if (seen.has(key)) throw new Error('Повтор даты и номера заказа: строка исключена из итогов');
          seen.add(key);
          accepted.push({ date, order, revenue, cost, plan });
          if (cost > revenue) warnings.push(label + ': затраты выше выручки — проверьте заказ ' + order);
        } catch (error) { errors.push(label + ': ' + error.message); }
      }
    }
    const totals = accepted.reduce((sum, row) => ({ revenue: sum.revenue + row.revenue,
      cost: sum.cost + row.cost, plan: sum.plan + row.plan }), { revenue: 0, cost: 0, plan: 0 });
    return { accepted, errors, warnings, ...totals, profit: totals.revenue - totals.cost,
      variance: totals.revenue - totals.plan,
      variancePercent: totals.plan === 0 ? null : (totals.revenue - totals.plan) / totals.plan * 100 };
  }
  const api = { money, calculate, parseCSV, summarize, HEADERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BusinessDemo = api;
})(typeof window !== 'undefined' ? window : globalThis);
