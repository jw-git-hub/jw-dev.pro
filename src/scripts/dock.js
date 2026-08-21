/**
 * Нижний док: кольцо прогресса и правило показа (DESIGN-GUIDE §14).
 *
 * Док появляется, когда прокручено больше половины экрана, прячется при
 * движении вниз и возвращается при движении вверх. Гистерезис обязателен:
 * без накопителя док дёргался бы на каждом микродвижении колеса.
 *
 * В конце страницы он показан всегда — там находятся контакты, и прятать
 * кнопку «написать» ровно в этот момент бессмысленно.
 */
const SHOW_FROM = 0.55; // доля высоты экрана, после которой док появляется
const HIDE_ACC = 110; // накоплено вниз — прячем
const SHOW_ACC = -60; // накоплено вверх — показываем
const RING = 88; // длина окружности кольца, r = 14
const AT_END = 0.985;

const dock = document.getElementById('dock');
const arc = document.getElementById('dock-arc');
const percent = document.getElementById('dock-pct');

let lastY = window.scrollY;
let acc = 0;
let queued = false;

/** Доля прочитанного: 0 — верх страницы, 1 — конец. */
function readProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(window.scrollY / max, 1) : 0;
}

function paintRing(progress) {
  arc.style.strokeDashoffset = String(RING * (1 - progress));
  percent.textContent = `${Math.round(progress * 100)}%`;
}

/** Накопитель сбрасывается при смене направления — иначе док залипает. */
function accumulate(delta) {
  acc = Math.sign(delta) === Math.sign(acc) ? acc + delta : delta;
  return acc;
}

function syncVisibility(progress) {
  dock.classList.toggle('on', window.scrollY > window.innerHeight * SHOW_FROM);

  const moved = accumulate(window.scrollY - lastY);
  lastY = window.scrollY;

  if (progress > AT_END || moved < SHOW_ACC) dock.classList.remove('hid');
  else if (moved > HIDE_ACC) dock.classList.add('hid');
}

function update() {
  queued = false;
  const progress = readProgress();
  paintRing(progress);
  syncVisibility(progress);
}

if (dock && arc && percent) {
  update();
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
}
