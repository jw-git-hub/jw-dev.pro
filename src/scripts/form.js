/**
 * Форма заявки: надстройка над обычной отправкой (план Ф9).
 *
 * Без этого файла форма работает: браузер шлёт `POST /api/contact`, приёмник
 * отвечает редиректом на `/sent/` или `/not-sent/`. Скрипт делает ровно две
 * вещи — отмечает время открытия для проверки «человек ли это» и показывает
 * ответ прямо в карточке, не уводя со страницы.
 *
 * Любая осечка — сеть, приёмник, разбор ответа — снимает перехват и отправляет
 * форму обычным способом. Заявка важнее плавности.
 */
const form = document.getElementById('frm');
const started = document.getElementById('f-started');
const done = document.getElementById('frm-done');
const doneTitle = document.getElementById('frm-done-t');
const doneText = document.getElementById('frm-done-d');
const body = form?.querySelector('.fbody');
const submit = form?.querySelector('.frm-send span');

/** Тексты ответа переведены на сборке и лежат на страницах ответа. */
const ANSWER_URL = { ok: '/sent/', fail: '/not-sent/' };

function localize(path) {
  const locale = form.elements.locale.value;
  return locale === 'en' ? path : `/${locale}${path}`;
}

/** Заголовок и текст ответа берём с той же страницы, куда ушли бы без JS. */
async function answerText(kind) {
  const response = await fetch(localize(ANSWER_URL[kind]));
  if (!response.ok) throw new Error(String(response.status));

  const page = new DOMParser().parseFromString(await response.text(), 'text/html');
  return {
    title: page.querySelector('h1').textContent,
    text: page.querySelector('.lead').textContent,
  };
}

function showAnswer({ title, text }) {
  doneTitle.textContent = title;
  doneText.textContent = text;
  body.hidden = true;
  done.hidden = false;
}

async function send(event) {
  event.preventDefault();
  submit.textContent = submit.dataset.sending;

  try {
    // Просим JSON: без этого приёмник отвечает редиректом, а `fetch`
    // проглатывает его молча — отличить успех от отказа было бы нечем.
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });
    showAnswer(await answerText(response.ok ? 'ok' : 'fail'));
  } catch {
    // Перехват снят — та же кнопка отправит форму как обычную.
    form.removeEventListener('submit', send);
    form.submit();
  }
}

if (form && started && done && body && submit) {
  started.value = String(Date.now());
  form.addEventListener('submit', send);
}
