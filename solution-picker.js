(() => {
  'use strict';
  const form = document.getElementById('solution-picker');
  const fields = [...form.querySelectorAll('[data-picker-step]')];
  const questions = document.getElementById('picker-questions');
  const result = document.getElementById('picker-result');
  const error = document.getElementById('picker-error');
  const back = document.getElementById('picker-back');
  const next = document.getElementById('picker-next');
  const message = document.getElementById('picker-message');
  const telegram = document.getElementById('picker-telegram');
  const copyStatus = document.getElementById('picker-copy-status');
  const solutions = {
    report: { task:'Собрать и проверить отчёт', title:'Автоматизация одного отчёта', description:'Начнём с исходных файлов и правил проверки. Инструмент сможет объединять данные, выполнять расчёты и показывать расхождения.', link:'#report-demo' },
    calculator: { task:'Рассчитать заказ или стоимость', title:'Калькулятор под ваши правила расчёта', description:'Определим параметры и формулы, чтобы сотрудник мог рассчитать заказ и увидеть, как меняется результат при изменении цены или затрат.', link:'#demo' },
    control: { task:'Контролировать заказы и задачи', title:'Приложение со статусами и ответственными', description:'Начнём с одного процесса: кто создаёт запись, кто обновляет статус и какой результат должен видеть руководитель.', link:'#work' },
    dashboard: { task:'Видеть показатели в одном месте', title:'Дашборд по данным ваших систем', description:'Выберем показатели и источники данных, согласуем расчёты. Соберём экран с динамикой, отклонениями и нужной детализацией.', link:'#dashboard-case' },
    integration: { task:'Связать программы и уведомления', title:'Интеграция сервисов и Telegram', description:'Определим, какое событие запускает передачу данных, куда должна попасть запись и кому нужно уведомление. Начнём с одной связки.', link:'#cash-case' },
    other: { task:'Другая задача — хочу обсудить', title:'Разбор одного рабочего процесса', description:'Расскажите, что вы делаете вручную и какой результат хотите получить. Вместе определим, какой инструмент подходит и с чего начать.', link:'#start' }
  };
  let step = 0;
  function showStep(index) {
    step = index;
    fields.forEach((field,i) => { field.hidden = i !== step; });
    document.getElementById('picker-step').textContent = `Вопрос ${step + 1} из 3`;
    document.getElementById('picker-progress').value = step + 1;
    back.hidden = step === 0;
    next.textContent = step === 2 ? 'Подобрать решение' : 'Далее';
    error.textContent = '';
    fields[step].querySelector('legend').focus({ preventScroll: true });
    form.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function updateMessageLink() {
    const text = message.value.trim();
    telegram.href = text ? 'https://t.me/Ekater5rina?text=' + encodeURIComponent(text) : 'https://t.me/Ekater5rina';
    copyStatus.textContent = '';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!fields[step].querySelector('input:checked')) {
      error.textContent = step === 1 ? 'Выберите хотя бы один источник или вариант «Пока не знаю».' : 'Выберите один вариант ответа.';
      fields[step].querySelector('input').focus();
      return;
    }
    if (step < 2) { showStep(step + 1); return; }
    const values = new FormData(form);
    const choice = solutions[values.get('task')];
    document.getElementById('picker-recommendation').textContent = choice.title;
    document.getElementById('picker-description').textContent = choice.description;
    document.getElementById('picker-example').href = choice.link;
    message.value = `Здравствуйте, Екатерина!\n\nХочу обсудить разработку инструмента.\nЗадача: ${choice.task}.\nИсточники данных: ${values.getAll('sources').join(', ')}.\nПользователи: ${values.get('audience')}.\n\nПредварительный вариант: ${choice.title}.\nХочу уточнить объём работ и с чего можно начать.`;
    updateMessageLink();
    questions.hidden = true; result.hidden = false;
    document.getElementById('picker-recommendation').focus({ preventScroll: true });
    form.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  back.addEventListener('click', () => showStep(Math.max(0,step - 1)));
  form.addEventListener('change', event => {
    error.textContent = '';
    if (event.target.name !== 'sources' || !event.target.checked) return;
    // The unknown-source option is exclusive; actual sources may be combined.
    form.querySelectorAll('input[name="sources"]').forEach(input => {
      if (input !== event.target && (input.value === 'Нужно определить' || event.target.value === 'Нужно определить')) input.checked = false;
    });
  });
  document.getElementById('picker-edit').addEventListener('click', () => {
    result.hidden = true; questions.hidden = false; showStep(0);
  });
  message.addEventListener('input', updateMessageLink);
  document.getElementById('picker-copy').addEventListener('click', async () => {
    if (!message.value.trim()) { copyStatus.textContent = 'Сначала введите текст обращения.'; message.focus(); return; }
    try {
      await navigator.clipboard.writeText(message.value);
      copyStatus.textContent = 'Текст скопирован. Его можно вставить в переписку.';
    } catch (_) {
      message.focus(); message.select();
      copyStatus.textContent = 'Выделенный текст можно скопировать вручную.';
    }
  });
})();
