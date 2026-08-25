# DESIGN-GUIDE — jw.dev

Этот файл описывает **только визуальный язык** сайта: цвет, типографику, стекло, движение и фирменные
компоненты. **Состав разделов, структуру страниц и роуты он не задаёт** — это решает владелец.

Эталон — макет `13-final.html`, лежит рядом. Всё здесь извлечено из него; если код в этом файле
и код в макете расходятся, прав макет.

## Как это подключить

Файл самостоятельный и **ничего не перезаписывает**. Положи его в репозиторий, например
`docs/DESIGN-GUIDE.md`, туда же `docs/13-final.html` — и добавь в свой существующий `CLAUDE.md`
**одну строку**. Больше в нём ничего менять не нужно:

```md
Визуальный язык сайта описан в `docs/DESIGN-GUIDE.md`, эталонный макет — `docs/13-final.html`.
Перед правками вёрстки и стилей сверяйся с ними. Отклонения — только по прямой просьбе владельца.
```

Читать целиком не обязательно: разделы независимы, это справочник значений. При работе над
интерфейсом полезнее держать открытым сам макет в браузере, а сюда заглядывать за числами.

## Что здесь главное

Три вещи, ради которых этот дизайн и выбран. Их нельзя терять ни при какой переработке:

1. **Движение.** Статичный экран здесь — брак, а не «спокойное решение». Живут фон, карточки,
   кнопки, курсор. Всё движение выключается при `prefers-reduced-motion`.
2. **Процесс с бегущим импульсом** — §11.
3. **Интерактивное 3D-кольцо со стеком технологий** — §12.

Плюс постоянные признаки: тёмная база с разноцветными акцентами, меняющимися по секциям;
стеклянная шапка; свет, идущий за курсором; переливающиеся рамки; **только кнопки-пилюли**.

Чего в этом дизайне быть не должно (прямые запреты владельца): монотонный синий, кейсы списком
вместо карточек, широкие прямоугольные кнопки, скучные секции стека и процесса, мутное
пересвеченное стекло.

---

## 1. Цветовые токены

Объявлены в `:root`. Три токена — `--acc`, `--acc-ink` и `--acc2` — регистрируются
через `@property`, чтобы их можно было **анимировать** при смене секции.

```css
@property --acc{syntax:'<color>';inherits:true;initial-value:#22D3EE}
@property --acc-ink{syntax:'<color>';inherits:true;initial-value:#22D3EE}
@property --acc2{syntax:'<color>';inherits:true;initial-value:#A855F7}
:root{
--bg:#070912; --bg2:#05060D; --panel:#0D1120; --panel2:#0A0E1B;
--ink:#F0F4FA; --ink2:rgba(240,244,250,.72); --ink3:rgba(240,244,250,.56);
--indigo:#4F46E5; --cyan:#22D3EE; --violet:#A855F7; --amber:#FFB020; --rose:#FF4D9E;
--indigo-ink:#818CF8;
--acc:#22D3EE; --acc-ink:#22D3EE; --acc2:#A855F7;
--line:rgba(255,255,255,.09); --line2:rgba(255,255,255,.055);
--r:22px; --r2:16px;
--e:cubic-bezier(.16,1,.3,1);
--hdr:70px;
transition:--acc .9s var(--e), --acc-ink .9s var(--e), --acc2 .9s var(--e);
}
```

### Отступление от макета: чернильный индиго

В макете акцент один — `--acc` — и он же пишет, и он же заливает. Для четырёх цветов
из пяти это работает, для индиго нет: `#4F46E5` даёт **3,16:1** на фоне и **2,92:1**
на стекле. Это ниже порога AA и для текста (4,5:1), и для обводки фокуса (3:1),
а индиго — акцент трёх секций из одиннадцати. Правило владельца «WCAG 2.2 AA»
и таблица §2 в макете несовместимы, и разрешено это в пользу доступности
**решением владельца от 22.08.2026**.

Поэтому акцентов теперь три, а не два:

| Токен | Что делает | Индиго | Остальные четыре |
|---|---|---|---|
| `--acc` | заливки, свечения, тени, пятна, узлы графа | `#4F46E5` | цвет акцента |
| `--acc-ink` | **всё, что пишет или обводит**: текст, обводка фокуса, 1px-линии, точки состояния, заливка под тёмным текстом | `#818CF8` (6,66:1) | тот же цвет, что `--acc` |
| `--acc2` | напарник в градиентах | `#22D3EE` | по таблице §2 |

`#818CF8` — не новый цвет, а тот же оттенок на четыре ступени светлее (indigo-400).
Правило простое: **красишь фон — `--acc`, красишь пиксели текста или линию, которую
надо разглядеть, — `--acc-ink`.**

| Токен | Значение | Для чего |
|---|---|---|
| `--bg` | `#070912` | фон `body`, база всей страницы; он же в `theme-color` |
| `--bg2` | `#05060D` | объявлен как резерв, в макете **не используется** |
| `--panel` | `#0D1120` | непрозрачная панель; в макете подставлен литералом в `select option` |
| `--panel2` | `#0A0E1B` | нижний цвет градиентов слота скриншота, миниатюры журнала и панели разбора; в макете тоже литералом |
| `--ink` | `#F0F4FA` | заголовки, буквы `jw` в знаке, основной белый |
| `--ink2` | `rgba(240,244,250,.72)` | **минимум для абзацев**, вторичный текст, лейблы кнопок |
| `--ink3` | `rgba(240,244,250,.56)` | только моно-подписи, чипы, подписи полей. Не для абзацев |
| `--cyan` | `#22D3EE` | акцент 1: hero, stack |
| `--indigo` | `#4F46E5` | акцент 2: stats, about, kit. **Только заливки** — контраст 3,16:1 |
| `--indigo-ink` | `#818CF8` | им пишут в индиго-секциях: 6,66:1 на фоне, 6,16:1 на стекле |
| `--violet` | `#A855F7` | акцент 3: services, journal |
| `--amber` | `#FFB020` | акцент 4: process; бейдж «В разработке»; «optional» в таблице |
| `--rose` | `#FF4D9E` | акцент 5: work, contact; ошибки формы |
| `--line` | `rgba(255,255,255,.09)` | стандартная волосяная рамка (в компонентах чаще написана литералом) |
| `--line2` | `rgba(255,255,255,.055)` | рамки-разделители: marquee, подвал, `.hr` |
| `--r` | `22px` | базовый радиус `.g`; `--r2` (`16px`) объявлен, но в макете не используется |
| `--e` | `cubic-bezier(.16,1,.3,1)` | **единственный** easing проекта |
| `--hdr` | `70px` | высота шапки (в состоянии `.stuck` — 60px) |

Служебные цвета вне токенов: `#34D399` — «живое/успех» (точка live, бейдж LIVE, галочки в таблице,
тик успешной отправки); `#05070E` — тёмный текст на светлых заливках (primary-кнопка, активный
таб фильтра, аватар); `#94A3B8` — серый закрытого кейса `th.neva.beauty`.

### Шум и подложки

```css
--noise:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
```

- Глобальное зерно: `body::after{position:fixed;inset:0;z-index:60;opacity:.045;mix-blend-mode:overlay;pointer-events:none}`.
- Внутри стекла — тот же шум с `opacity:.03` (см. §4).

Три фиксированных фоновых слоя под контентом (`.plane`, `z-index:0…2`):

1. `#aurora` — 6 цветных пятен (`.b1…b6`) в `filter:blur(100px) saturate(125%)`, каждое дрейфует
   `dr1…dr5`, 32–45 с, `infinite alternate`. Цвета: indigo, cyan, violet, amber, rose, cyan.
2. `#veil` (`z-index:1`) — два градиента цвета `#070912`, гасят пятна к низу страницы.
3. `#graph` (`z-index:2`, `opacity:.66`) — канвас графа, §9.
4. `#light` (`z-index:2`) — 900×900 радиальный градиент `color-mix(in srgb,var(--acc) 26%,transparent)`,
   `mix-blend-mode:screen`, следует за курсором; включается классом `body.pt` (`opacity:.5`).

Контент лежит выше: `section{position:relative;z-index:3}`.

---

## 2. Механика акцента секции

Каждая `<section>` объявляет свой акцент атрибутом `data-acc`:

| Секция | `data-acc` | `--acc` | `--acc-ink` | `--acc2` |
|---|---|---|---|---|
| `#hero` | cyan | `#22D3EE` | `#22D3EE` | `#4F46E5` |
| `#stats` | indigo | `#4F46E5` | **`#818CF8`** | `#22D3EE` |
| `#services` | violet | `#A855F7` | `#A855F7` | `#FF4D9E` |
| `#work` | rose | `#FF4D9E` | `#FF4D9E` | `#A855F7` |
| `#stack` | cyan | `#22D3EE` | `#22D3EE` | `#4F46E5` |
| `#process` | amber | `#FFB020` | `#FFB020` | `#FF4D9E` |
| `#about` | indigo | `#4F46E5` | **`#818CF8`** | `#22D3EE` |
| `#journal` | violet | `#A855F7` | `#A855F7` | `#FF4D9E` |
| `#faq` | cyan | `#22D3EE` | `#22D3EE` | `#4F46E5` |
| `#contact` | rose | `#FF4D9E` | `#FF4D9E` | `#A855F7` |
| `#kit` | indigo | `#4F46E5` | **`#818CF8`** | `#22D3EE` |

Тройки живут в `src/styles/accent.css` под селекторами `html[data-acc='…']`,
а не подставляются из скрипта: значений цвета в JS в проекте нет вовсе.

```js
var ACC={cyan:['#22D3EE','#4F46E5'],indigo:['#4F46E5','#22D3EE'],violet:['#A855F7','#FF4D9E'],
         amber:['#FFB020','#FF4D9E'],rose:['#FF4D9E','#A855F7']};
function setAcc(name){ var p=ACC[name]||ACC.cyan;
  root.style.setProperty('--acc',p[0]); root.style.setProperty('--acc2',p[1]);
  if(window.__graph&&window.__graph.tint) window.__graph.tint(ACC[name]?name:'cyan');
  if(typeof syncPrBtn==='function') syncPrBtn(); }
```

Определение текущей секции — по «зонду» на 34% высоты экрана:

```js
var probe=y+window.innerHeight*0.34, cur=SECS[0];
for(var i=0;i<SECS.length;i++){ if(SECS[i].top<=probe) cur=SECS[i]; }
```

Переход между акцентами плавный за счёт `transition:--acc .9s var(--e)` на `:root` (работает
только потому, что токены зарегистрированы через `@property`). Одновременно перекрашиваются:
знак `>jw_`, `.kick`, подчёркивание активного пункта нав, свет за курсором, тинт графа,
рамки и свечения активных состояний, кольцо прогресса в доке.

Ручная блокировка: переключатель акцента в «Интерфейсном наборе» (`.accsw button[data-a]`)
ставит `accLocked=true` и фиксирует цвет; кнопка `#accAuto` снимает блокировку и возвращает
акцент текущей секции.

---

## 3. Типографика

```css
--ff:'Onest Variable',-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif;
--fm:ui-monospace,"SF Mono",SFMono-Regular,Menlo,monospace;
body{font-size:16px;line-height:1.62;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
```

### Отступление от макета: свой шрифт

В макете шрифтов не было вовсе — только системные, а «фирменность» держал плотный
отрицательный трекинг. Числа трекинга сняты с **SF Pro Display**, то есть с macOS и iOS.
Клиент приходит с Windows и Android, получает Segoe UI или Roboto, и −0.042em на кириллице
там ведёт себя иначе: трекинг был рассчитан на меньшинство посетителей, а разница между
«дорого» и «как у всех» держалась именно на нём.

**Решение владельца от 22.08.2026:** в проект добавлен свой переменный шрифт —
**Onest** (OFL-1.1), два подмножества woff2 в `public/fonts/`, кириллица 14 КБ + латиница
32 КБ. Файлы свои, с того же домена: «ноль внешних запросов» не нарушено, CSP
(`font-src 'self'`) не правится. Объявления — в `src/styles/fonts.css`, `unicode-range`
обязателен, иначе браузер качает оба файла вместо нужного одного. Подмножество своего
языка предзагружается в `<head>` с `crossorigin`.

Числа трекинга **не меняются**: Onest держит −0.042em на кириллице без слипания
(проверено на «Жюри съело шхуну — ЖЫЮЪ»). Теперь они описывают конкретную гарнитуру,
а не гарнитуру одной платформы.

Моноширинный остаётся системным: он используется на подписях 10–12px, где разница
между гарнитурами не читается, а ещё один файл стоил бы дороже пользы.

| Роль | CSS |
|---|---|
| H1 (герой) | `font-size:clamp(2.3rem,4.6vw,4.4rem); line-height:1.02; letter-spacing:-.042em; font-weight:700; text-wrap:balance` |
| H2 (секции) | `font-size:clamp(1.95rem,4.2vw,3.35rem); line-height:1.03; letter-spacing:-.038em; font-weight:680` |
| H2 в разборе кейса | `font-size:clamp(1.5rem,3.6vw,2.5rem); overflow-wrap:anywhere` |
| H3 | `font-size:1.14rem; letter-spacing:-.02em; font-weight:640; line-height:1.28` |
| H3 в карточке услуги | `font-size:1.26rem` |
| H3 в шаге процесса | `font-size:1.06rem; letter-spacing:-.026em` |
| `.lead` | `color:var(--ink2); font-size:clamp(1rem,1.15vw,1.09rem); max-width:60ch; margin-top:14px` |
| `.hero-sub` | `color:var(--ink2); font-size:clamp(1rem,1.35vw,1.16rem); max-width:56ch; margin-top:22px` |
| `.mono` | `var(--fm); 11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink3)` |
| `.kick` (надзаголовок) | `var(--fm); 11px; letter-spacing:.18em; uppercase; color:var(--acc-ink)`, перед ним черта 22×1px градиентом к `--acc-ink` |
| Текст карточки кейса | `13.6px / 1.55`, цвет `--ink2` |
| Название кейса `.case-ttl` | `var(--fm); 15px; font-weight:600; letter-spacing:-.01em` |
| Цена `.svc .price` | `var(--fm); 14px; color:var(--acc-ink); font-weight:600` |
| Пункты мобильного меню | `clamp(1.6rem,8vw,2.3rem); font-weight:660; letter-spacing:-.04em` |
| Статистика `.stat .v` | `clamp(1.9rem,3.4vw,2.9rem); font-weight:700; letter-spacing:-.045em; line-height:1` |

Переливающееся слово в H1 — градиентный текст с бесконечным сдвигом фона:

```css
h1 .grad{
  background:linear-gradient(96deg,#22D3EE 0%,#A855F7 22%,#FF4D9E 42%,#FFB020 62%,#4F46E5 82%,#22D3EE 100%);
  background-size:340% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  animation:slide 7.5s linear infinite;padding-right:.04em}
@keyframes slide{to{background-position:320% 0}}
```

H1 разрезан на три ключа i18n (`hero.h1a` / `hero.h1b` / `hero.h1c`), чтобы переливалось
именно слово `Engineered` / `Инженерия`, а не весь заголовок.

Числа в `.stat .v` — градиент от `--ink` к акценту: `linear-gradient(120deg,var(--ink),color-mix(in srgb,var(--acc) 80%,var(--ink)))`.

---

## 4. Сетка, отступы, радиусы

```css
.wrap{width:100%;max-width:1260px;margin:0 auto;padding:0 clamp(18px,4vw,42px)}
section{padding:clamp(64px,7vw,112px) 0;scroll-margin-top:88px}
.sec-head{margin-bottom:clamp(34px,4vw,58px);max-width:820px}
.sec-head.row{max-width:none;display:flex;align-items:flex-end;justify-content:space-between;gap:28px;flex-wrap:wrap}
```

### Отступление от макета: ритм секций

В макете отступ секции — `clamp(76px, 9.5vw, 148px)`. Между двумя соседними блоками это
даёт **296px**: на ноутбучном окне высотой 784px — больше трети экрана. Заполнить его
нечем. Вуаль `#veil` гасит аврору именно в этой зоне, рёбра графа идут на альфе 0,18,
и промежуток читается не как воздух, а как дыра, в которой что-то не догрузилось.

**Решение ревизии C3 от 22.08.2026**, измерено в фазе 4 на первой настоящей паре секций
(герой → статистика → направления): отступ срезан до `clamp(64px, 7vw, 112px)`.
Между блоками остаётся 224px вместо 296 — вдвое больше самого крупного кегля на странице,
блоки по-прежнему не слипаются, а пустого поля больше нет. Остальные числа §4 не менялись.

Второй инструмент против дыр — `.sec-flush` (`padding-top: 0`): секция, которая читается
как продолжение предыдущей, ставится вплотную. Так стоит статистика под героем.

Скролл к якорю всегда с отступом 78px (`goTo()` и обработчик кликов по `a[href^="#"]`).

Радиусы: пилюли и все кнопки — `999px`; карточка кейса — `24px`; карточка услуги и `.about-card`,
`.frm` — `26px`; панель разбора кейса — `28px`; `.g` по умолчанию — `var(--r)` `22px`;
шаг процесса — `20px`; строка журнала — `18px`; поля ввода — `14px`; иконка шага `.pico` — `11px`;
миниатюра журнала — `9px`. Прямоугольников с малым радиусом в системе нет (прямой запрет владельца).

Сетки: `.stats` — 4 колонки; `.svcs` — 3; `.grid6` — 3 (gap 18px, `margin-top:26px`);
`.two` (FAQ + таблица) — 2; `.ctaform` — 2; `.kit` — 2; `.prsteps` — 5; `.about` — `.9fr 1.1fr`;
`.ovl-body` — `1.55fr .85fr`.

---

## 5. Стекло

Класс `.g` — «стекло без блюра», `.blur` добавляется **только** там, где блюр реально нужен.
Это и есть страховка от правила «не больше 6 блюрящих элементов на экране».

```css
.g{position:relative;border-radius:var(--r);
  background:rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.09);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28),
             inset 0 -1px 0 rgba(255,255,255,.05),
             0 24px 60px -30px rgba(0,0,0,.9);
  isolation:isolate}
.g::after{content:'';position:absolute;inset:0;border-radius:inherit;
  background-image:var(--noise);opacity:.03;pointer-events:none;z-index:0;mix-blend-mode:overlay}
.g>*{position:relative;z-index:1}
.blur{backdrop-filter:blur(14px) saturate(130%);-webkit-backdrop-filter:blur(14px) saturate(130%)}
.gd{background:rgba(255,255,255,.03);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),
             inset 0 -1px 0 rgba(255,255,255,.04),
             0 18px 44px -26px rgba(0,0,0,.85)}
html.noblur .win-body{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(13,17,32,.72)}
```

Правила, которые нельзя нарушать:

- `blur` ровно `14px`, `saturate` ровно `130%`. 22–28px превращают фон в кашу.
- Заливка `.045` (тише — `.gd`, `.03`). Никогда `.13`.
- Блик **только сверху** (`inset 0 1px 0 rgba(255,255,255,.28)`) плюс еле заметный снизу (`.05`).
  Рамка по периметру слабая — `rgba(255,255,255,.09)`.
- Под стеклом обязана быть видимая структура: граф, пятно ауроры, сетка. Стекло над пустотой —
  это серый прямоугольник.
- Шум внутри `.03` — единственное, что убирает «пластик».
- Тень снизу тёмная и мягкая: `0 24px 60px -30px rgba(0,0,0,.9)`.
- Не вкладывать стекло в стекло: максимум один слой `backdrop-filter` в глубину.

`html.noblur` ставится при открытии мобильного меню, разбора кейса и архива — блюрящие окна героя
отключаются, чтобы не складывать `backdrop-filter` в несколько слоёв.

Реальные носители `backdrop-filter` на странице: шапка (`blur(11px)`, в `.stuck` — `blur(14px)`),
`.win-body` (3 окна героя), `.mnav`, `.arc`, `.ovl`, `.dock`. Одновременно видимы максимум 4–5.

---

## 6. Переливающаяся рамка `.irid`

Волосяная рамка градиентом по всему спектру палитры, реализована маской (border-box минус content-box),
чтобы не рисовать фон. Появляется по ховеру/фокусу; вариант `.always` светится постоянно.

```css
.irid::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;
  pointer-events:none;z-index:2;
  background:linear-gradient(115deg,var(--cyan),var(--violet) 22%,var(--rose) 42%,
                             var(--amber) 62%,var(--indigo) 82%,var(--cyan));
  background-size:320% 100%;
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  opacity:0;transition:opacity .55s var(--e);animation:slide 9s linear infinite}
.irid:hover::before,.irid:focus-within::before,.irid.on::before{opacity:.9}
.irid.always::before{opacity:.42}
.irid.always:hover::before{opacity:1}
```

Носители: `.stat`, `.svc` (у featured — `.always`), `.case` (у `jw_social_downloader` — `.always`),
`.about-card`, `.frm`, `.kitb`.

Вариант для кнопок — `.btn.trav`: та же техника, `padding:1.4px`, скорость `slide 2.6s`,
покой `opacity:.28`, ховер — `1`. Стоит на кнопках контактов и на кнопке отправки формы
(владелец отдельно отметил эту анимацию как удачную).

---

## 7. Кнопки

Базовый класс — всегда пилюля.

```css
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;border-radius:999px;
  border:1px solid transparent;padding:13px 25px;font-size:14.5px;font-weight:620;letter-spacing:-.012em;
  cursor:pointer;position:relative;background:none;white-space:nowrap;text-align:center;
  transition:transform .45s var(--e),box-shadow .45s var(--e),background .35s var(--e),
             color .35s var(--e),opacity .3s}
.btn:hover{transform:translateY(-2px)}
.btn:active{transform:translateY(0) scale(.985)}
.btn svg{width:16px;height:16px;flex:none}
```

| Вариант | Класс | Отличия |
|---|---|---|
| Primary | `.btn.p` | текст `#05070E`, `font-weight:700`, заливка `linear-gradient(118deg,var(--acc-ink) 0%,var(--acc2) 58%,var(--rose) 100%)` (первая точка чернильная: под тёмным лейблом), с `background-size:200% 100%`; на ховере `background-position:100% 0`; тень `0 12px 34px -16px color-mix(in srgb,var(--acc) 70%,transparent)` → на ховере `0 18px 44px -16px …85%` |
| Secondary | `.btn.s` | `rgba(255,255,255,.045)`, рамка `.11`, `inset 0 1px 0 rgba(255,255,255,.16)`; ховер — заливка `.085`, рамка `.2` |
| Ghost | `.btn.gh` | `color:var(--ink2)`, прозрачная; ховер — `rgba(255,255,255,.06)` |
| Small | `.btn.sm` | `padding:8px 16px; font-size:12.5px` |
| Icon | `.btn.ico` | `40×40`, `padding:0`; вместе с `.sm` — `32×32` |
| Disabled | `[disabled]`, `[aria-disabled=true]` | `opacity:.4; cursor:not-allowed; pointer-events:none` |
| Loading | `.btn .spn` | спиннер 14×14, рамка `2px rgba(255,255,255,.28)`, верх — `var(--acc-ink)`, `animation:spin1 .8s linear infinite` |
| С переливом | `.btn.trav` | см. §6 |

Прочие пилюли: `.pill` (тег/факт, `padding:6px 13px`, 12.5px), `.pill.mn` (моно, 10.5px, uppercase),
`.pill.acc` (в цвете акцента), `.fbtn` (таб фильтра, `padding:9px 18px`; активный —
`aria-pressed="true"`, заливка `linear-gradient(118deg,var(--acc-ink),var(--acc2))`, текст `#05070E`),
`.chip` (метрика кейса, цвет из `--cc` карточки через `color-mix`), `.tag` (стек, `--ink3`),
`.badge` (`.pop` amber→rose, `.dev` amber, `.live` `#34D399`→cyan, `.off` нейтральный),
`.bdg` (`.ok` / `.wr` / `.er` / `.nt` — индикаторы в наборе).

---

## 8. Карточки

**Кейс `.case`** — это `<button type="button">` во всю ширину, `border-radius:24px`, `overflow:hidden`,
переменная `--cc` (цвет метрик) и `--cardc` (цвет вуали над скриншотом) задаются инлайново:

```css
.case{background:linear-gradient(170deg,rgba(255,255,255,.05),rgba(255,255,255,.022));
  border:1px solid rgba(255,255,255,.09);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.24), inset 0 -1px 0 rgba(255,255,255,.045),
             0 24px 60px -34px rgba(0,0,0,.95);
  transition:transform .6s var(--e),box-shadow .6s var(--e)}
.case:hover{transform:translateY(-7px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 40px 80px -34px rgba(0,0,0,1)}
.case:hover .shot-i{transform:scale(1.04)}
.case:hover .shot-veil{opacity:.6}
```

Три обязательных состояния:

1. **Обычная** — кейсы 02–05.
2. **LIVE** (`jw_social_downloader`): `.case.live.irid.always`, `--cc:#34D399`, рамка
   `color-mix(in srgb,#34D399 40%,transparent)`, псевдоэлемент `::after` даёт внутреннюю обводку и
   свечение `0 0 44px -10px rgba(52,211,153,.45)`, бейдж `Live demo`, в подвале — `Press a button`.
3. **Закрытая** (`th.neva.beauty`): `.case.closed{opacity:.74}`, ховер поднимает лишь на 3px и до
   `opacity:.85`, `.case-foot{cursor:not-allowed;color:var(--ink3)}`, бейдж `.badge.off`, иконка замка,
   слот скриншота — `.shot.closed` (grayscale + диагональная штриховка).

Порядок содержимого карточки: слот скриншота → моно-подпись `screenshot` → `.case-body`
(индекс `01`–`06`, название моно, тип, описание, 3 чипа-метрики, теги стека, `.case-foot` со ссылкой).

**Слот скриншота `.shot`** — `aspect-ratio:16/10`, скруглён сверху по радиусу карточки,
обрезан снизу. Слои сверху вниз: `.shot-i` (сам контент; `transform-origin:50% 12%`,
`transition:transform .8s var(--e)`), `.shot-tint` (`mix-blend-mode:color`, `opacity:.55`),
`.shot-gloss` (диагональный блик), `.shot-veil`:

```css
.shot-veil{position:absolute;inset:0;pointer-events:none;transition:opacity .8s var(--e);
  background:linear-gradient(180deg,transparent 30%,var(--cardc,rgba(10,14,27,.96)) 100%)}
```

Вуаль цвета карточки — это и есть ответ на «встроить скриншоты, не портя дизайн»: любой пёстрый
скриншот уходит в палитру карточки, а на ховере вуаль слабеет до `.6` и картинка увеличивается на 4%.
Переменная `--sc` внутри слота задаёт цвет условной вёрстки (в проде — цвет тинта над фото).
Вариант `.shot.tg` рисует интерфейс Telegram вместо браузера.

**Услуга `.svc`** — `border-radius:26px`, `padding:30px 28px 28px`, `transform-style:preserve-3d`,
ховер `translateY(-6px) rotateX(1.4deg)`. Featured (`.svc.feat`) поднята на `-22px`, шире по паддингу
(`38px 30px 34px`), с более сильным бликом (`.34`) и тенью `0 44px 90px -40px rgba(0,0,0,1)`;
на ≤1020px подъём снимается. Вокруг сетки услуг летают четыре гранёных «кристалла» `.cry1…4`
(`clip-path` шестиугольник, `--c1/--c2` из палитры, дрейф 11–19 с); на ≤1020px они скрыты.

**Статистика `.stat`** — `.g.gd.irid`, `padding:26px 24px`, размытое цветное пятно `.glow`
(120×120, `blur(34px)`, `opacity:.4`) в правом верхнем углу. Числа считаются 1100 мс
(`easeOutCubic`) при появлении в вьюпорте.

**Отступление от макета: как именно считается число (22.08.2026, фаза 4).** Диапазон
отсчитывается от своей нижней границы, а не от нуля: «94–98», начатое с нуля, по дороге
показывает несуществующие «94–37». Финальное значение стоит в разметке (без JS оно обязано
быть верным), а скрипт отматывает назад только те карточки, которых сейчас не видно, —
иначе посетитель успевает прочитать «7» до того, как счётчик прыгнет в ноль. Из двух
страховок макета осталась одна, поэлементная (1400 мс): глобальная (1500 мс) проставляла
финал и невидимым карточкам, то есть возвращала ровно тот прыжок, от которого избавляет
отмотка по видимости.

**Отступление от макета: карточка — ссылка, а не кнопка (22.08.2026, фаза 6).**
В §8 выше `.case` описан как `<button type="button">` во всю ширину. В коде это
`<article>` со ссылкой на `/work/<slug>/`, растянутой на всю площадь через `::after`.
Две железные причины: без JS кнопка никуда не ведёт (правило 6 — кейсы обязаны
открываться), а ссылка на живое демо внутри кнопки — невалидная разметка, которую
валит `html-validate` (правило 7). Оверлей вешается на ту же ссылку скриптом. Ссылка
на демо лежит выше растяжки по слоям, поэтому по ней можно попасть отдельно.

**Отступление от макета: слот без кружков светофора (22.08.2026, решение владельца,
ревизия C5).** В макете над скриншотом рисуется `.shot-chrome` — три кружка светофора
и пилюля с адресом, 15% высоты слота. Кружки сняты: они не сообщают ничего, а слот
занимает больше половины карточки. Осталась строка адреса `.shot-bar`, ужатая до 22px.
Адрес говорит, на что вы смотрите; у ботов на его месте стоит имя бота из ссылки.
Высота фиксированная, а не доля слота: на обложке страницы разбора (2:1) процент
вырастал в полосу под сорок пикселей.

**Строка журнала `.jrow`** — `border-radius:18px`, миниатюра 66×41 (клон слота скриншота, ужатый
`transform:scale(.33)`), дата 86px моно, тип-чип 108px, заголовок и одна строка описания с
`text-overflow:ellipsis`, круглая стрелка `.jgo` 27px. На ≤680px раскладка переносится, стрелка скрывается.

---

## 9. Фоновый граф

Канвас `#graph` во весь вьюпорт, `position:fixed`, `pointer-events:none`, `opacity:.66`, `z-index:2`.

**Узлы.**

```js
var n = GW<760 ? 38 : Math.min(88, Math.round(GW*GH/21000));
NODES.push({x:…,y:…,vx:(Math.random()-.5)*.13,vy:(Math.random()-.5)*.13,
            r:1.05+Math.random()*1.35,c:PAL[i%5],ph:Math.random()*6.283});
```

То есть **не больше 88 узлов на десктопе и ровно 38 на ширине < 760px** (потолок, дальше падает кадровая частота на слабых машинах).
Палитра узлов `PAL` — те же пять акцентов. Узлы плавают со скоростью ±0.13 px/кадр и заворачиваются
за краями (`±40px`).

**Рёбра.** Соединяются пары ближе `LIM` (`150px` на десктопе, `128px` при `GW<760`),
альфа `(1-d/LIM)*.28`. Рядом с курсором (радиус 180px) альфа растёт на `k*.38`, толщина — до `1+k*1.3`.
Цвет рёбер — текущий тинт секции, догоняющий цель со скоростью `tint += (ttar-tint)*.035` за кадр.

**Привязка к интерфейсу.** Любой элемент с атрибутом `data-nx` становится якорем:
`data-nxc` — цвет (`cyan|violet|indigo|amber|rose|mint`), `data-nxg` — группа, `data-nxp="left|right"` —
сдвиг точки привязки на 13px за край элемента. От якоря тянутся рёбра к **трём ближайшим узлам**
(альфа `(1-dist/340)*.52` для первого и `*.28` для остальных, дальше 340px — не рисуются), сам якорь
получает точку r=2.1 и кольцо r=6.5. Якоря одной группы соединяются пунктиром `setLineDash([5,6])`.
Носители в макете: три окна героя (`data-nxg="hero"`), четыре HUD-пилюли, пять шагов процесса
(`data-nxg="proc"`). Это буквально то, что заказчик назвал «связь элементов интерфейса».

**Импульсы.** Порождаются не чаще одного раза в **820 мс** и только пока их меньше 10
(`PULSES.length>9` — выход). Скорость `0.006…0.012` доли ребра за кадр, живёт до 5 переходов
(`hops>5` — удаление). Рисуется ядро r=2.2, гало r=7.5 (`alpha .18`) и хвост от исходного узла.

**Демпфирование под текстом.** Раз в 560 мс пересчитываются прямоугольники элементов из `DSEL`
и всех `[data-damp]`, затем поверх графа рисуются радиальные «дыры» режимом `destination-out`:

```js
var DSEL='.sec-head,.case,.svc,.stat,.kitb,.frm,.contact-side,.acc,.tbl,.about-card,.about>.rv,.log-foot,.marq,.legend,.workline';
a=parseFloat(e.getAttribute('data-damp')); if(!(a>0)) a=.74;      // сила по умолчанию
ctx.globalCompositeOperation='destination-out';
var g2=ctx.createRadialGradient(0,0,0,0,0,1);
g2.addColorStop(0,'rgba(0,0,0,'+dm.a+')');
g2.addColorStop(.62,'rgba(0,0,0,'+(dm.a*.66).toFixed(3)+')');
g2.addColorStop(1,'rgba(0,0,0,0)');
```

Радиус дыры — габариты элемента плюс 30px по X и 26px по Y. Явные значения в макете:
`.hero-l` — `data-damp=".46"` (герой гасится слабее, там граф должен быть виден),
шаги процесса — `.62`, всё остальное — `.74`. В первом экране и в пустых зонах граф идёт на полной яркости.

**Производительность и паузы.** `DPR=Math.min(2,window.devicePixelRatio||1)`; единственный
`requestAnimationFrame`-цикл; граф **не** параллаксится (его рёбра привязаны к реальным элементам).
Останов: `document.hidden` (`visibilitychange`), открытие разбора кейса и архива
(`window.__graph.stop()` / `.start()`), `prefers-reduced-motion` — канвас полностью
`display:none`. Публичный API: `window.__graph = {start, stop, tint(name), remeasure()}`.
`remeasure()` обязателен после любой перестройки DOM (например, после `buildJournal()`).

---

## 10. Герой

Двухколоночная раскладка — решение владельца:

```css
.hero{padding:calc(var(--hdr) + clamp(34px,5vw,68px)) 0 clamp(30px,4vw,56px);
  min-height:min(100svh,1060px);display:flex;align-items:center;overflow-x:clip}
.hero-grid{display:grid;grid-template-columns:minmax(0,52fr) minmax(0,48fr);
  gap:clamp(24px,3.4vw,56px);align-items:center}
.hero-r{min-height:clamp(392px,41vw,548px)}
.stage{position:absolute;inset:0;perspective:1500px;perspective-origin:50% 44%;pointer-events:none}
```

Слева: пилюля-eyebrow с пульсирующей зелёной точкой, H1, подзаголовок, две кнопки-пилюли
(`See the work` — primary, `Try a live bot` — secondary со ссылкой на живого бота).
Справа: 3D-сцена из трёх окон и четырёх HUD-пилюль.

| Элемент | Позиция | `--tz` | `data-amp` | Содержимое |
|---|---|---|---|---|
| `.wA` | `left:-4%; top:16%; width:min(73%,382px)` | `-140` | 7 | окно браузера `vn.neva.beauty — clinic · 16 pages` |
| `.wB` | `right:-3%; top:0; width:min(37%,196px)` | `60` | 9 | окно Telegram `@jw_social_Downloader_bot`, `aspect-ratio:9/10` |
| `.wC` | `right:1%; bottom:0; width:min(46%,236px)` | `180` | 12 | панель метрик: подпись, крупное число, спарклайн, 6 столбиков |
| `.hudA…D` | углы сцены | 200–240 | 10–12 | четыре пары `подпись/значение` |

Глубина живёт в CSS (`--tz` у класса позиции), а не в атрибуте, как было в макете: без JS
сцена обязана остаться объёмной. В разметке от макета остался только `data-amp` — размах
параллакса, который читает `parallax.js`.

Содержимое HUD в макете (`UPTIME/99.9%`) — демонстрационное. `99.9%` никто не мерил, а правило
«цифры только измеренные» сильнее макета.

### Отступление от макета: сцена продаёт услугу, а не чужой сайт (25.08.2026, ревизия текстов)

Панель `.wC` в макете показывает `Lighthouse` и крупное `96`. Это метрика одного клиентского
сайта: первый экран продаёт ею один кейс вместо услуги, а сама цифра ничего не значит без
методики замера. Панель показывает `Открытый код` и `8` — восемь репозиториев `jw-git-hub`,
которые можно прочитать до оплаты; замер Lighthouse уехал в разбор `vn.neva.beauty`, где
названы версия инструмента, профиль и число прогонов.

По той же причине переписаны три пилюли из четырёх:

| Было (макет) | Стало | Почему |
|---|---|---|
| `Статус/Онлайн` | `Бот/отвечает сейчас` | «Онлайн» не говорит, что именно онлайн |
| `LIGHTHOUSE/96` → `Код/8 репозиториев` | `Код/после сдачи ваш` | счёт репозиториев переехал на панель, пилюля отдана условию сделки |
| `UPTIME/99.9%` → `Цены/204 в одном файле` | `Цены/правятся в одном месте` | 204 — внутренняя деталь: посетитель не знает, чьи это цены |

Четвёртая пилюля осталась как была — `Стек/Python · aiogram · Docker`: это подпись
к окну бота, а не обещание покупателю.

**Форму сцены это отступление не трогает.** Позиции, глубины, размах параллакса, дрейф
и цвета нитей — те же, что в таблице выше.

Под окнами — три размытых «каустика» (`.cA/.cB/.cC`, `filter:blur(44px)`, `opacity:.5`) цветами
cyan / violet / amber. Каждое окно дополнительно дрейфует (`drift1/2/3`, 14–21 с, `alternate`).

**Параллакс от курсора** (`parLoop`, включается только при `innerWidth>820` и без reduced-motion):

```js
cPX+=(tPX-cPX)*0.075; cPY+=(tPY-cPY)*0.075;          // сглаживание позиции курсора
lx+=(LX-lx)*0.11; ly+=(LY-ly)*0.11;                  // свет за курсором догоняет медленнее
aurora.style.transform='translate3d('+(cPX*-16)+'px,'+(cPY*-12)+'px,0)';
stageIn.style.transform='translate3d('+(cPX*10)+'px,'+(cPY*6-SCY*0.055)+'px,0) '+
                        'rotateX('+(cPY*-2.2)+'deg) rotateY('+(cPX*2.6)+'deg)';
// каждое окно:
w.style.setProperty('--ry',(cPX*7)+'deg');  w.style.setProperty('--rx',(cPY*-7)+'deg');
w.style.setProperty('--dx',(cPX*amp*1.7)+'px'); w.style.setProperty('--dy',(cPY*amp*1.3)+'px');
```

Цикл сам себя останавливает, когда разница между целью и текущим значением меньше 0.0015.

**На ≤900px** сцена схлопывается в колонку: заголовок **всегда** выше сцены (эта ошибка
в проекте уже случалась), `perspective:none`, окна становятся статичными блоками
`max-width:420px`, каустики скрыты, HUD выстраивается в ряд пилюль, дрейф выключен.

**Два уточнения от 22.08.2026 (фаза 4).** Заголовок держится выше сцены порядком
в разметке, а не `order:-1`: правило в CSS работает ровно до тех пор, пока кто-нибудь
не поменяет раскладку, а поток документа — всегда. И порог параллакса в JS — `901px`,
а не `innerWidth>820` из макета: в полосе 821–900px сцена уже схлопнута в колонку,
и параллакс там двигал то, чего нет.

---

## 11. Процесс: путь с бегущим импульсом

Одна из двух секций, ради которых выбран этот дизайн. SVG `viewBox="0 0 1000 230"`, одна кривая:

```html
<path id="prPath" class="prpath" d="M40,168 C170,44 300,42 440,104 S700,196 830,88 L960,60"/>
<path id="prPath2" class="prpath2" d="…то же…" stroke-dasharray="1 2000" stroke-dashoffset="0"/>
```

`.prpath` — серая подложка `rgba(255,255,255,.1)`, ширина 2. `.prpath2` — та же кривая градиентом
`#prg` (cyan → indigo → violet → rose → amber), ширина 2.6, открывается по мере движения импульса
через `stroke-dashoffset = prLen*(1-t)`.

Пять узлов стоят на долях длины пути `PR_FR=[.055,.29,.51,.735,.955]`, у каждого круг r=24,
номер `01…05` моно 15px и кольцо-гало r=26 (`animation:halo 2.4s ease-out infinite`,
`scale(.85)→scale(1.5)` с затуханием). Цвета привязки узлов к графу: `PR_C=['cyan','indigo','violet','rose','amber']`.

**Цикл импульса — ровно 12 000 мс на весь путь:**

```js
prT = ((ts-prT0)%12000)/12000; drawPulse(prT);
var idx=0; for(var i=0;i<5;i++) if(prT>=PR_FR[i]-.02) idx=i;
if(idx!==prActive) setPrActive(idx);
```

Шаг «загорается» в момент прохождения импульса: карточка `.pstep.on` поднимается на 6px, получает
рамку и свечение акцента, иконка и номер красятся в `--acc`, текст светлеет с `--ink3` до `--ink2`.
Клик по узлу или по карточке фиксирует шаг (`pinStep`, повторный клик снимает), кнопка
`#prtoggle` переключает `Auto-run: on/off`. Цикл живёт только пока секция в вьюпорте
(`IntersectionObserver`, `rootMargin:'140px'`) и вкладка видна.

**На ≤900px** SVG скрывается (`opacity:0`), карточки становятся вертикальным списком, слева
появляется рельса `.prail` шириной 2px с точкой `.prail i` (10px, свечение акцентом), которая едет
по `top:(t*100)%` с `transition:top .9s var(--e)`.

---

## 12. Стек: интерактивное 3D-кольцо чипов

Владелец назвал эту секцию одной из двух, ради которых выбран дизайн. Смысл: стек — не список,
а объект, который можно крутить рукой. Технологии живут чипами-пилюлями на трёх ярусах кольца,
кольцо медленно вращается само, останавливается под курсором и тянется мышью.

### Разметка

```html
<div class="ringwrap">
  <div class="legend">                        <!-- 5 групп, фильтр по наведению -->
    <button class="leg" data-g="be"><i></i>Бэкенд</button>
    …  <!-- be / fe / infra / qa / ai -->
  </div>
  <div class="ring" id="ring">
    <div class="ring-in" id="ringIn">
      <span class="chip3" data-g="be" style="--cc:#22D3EE"><i></i>Python</span>
      …                                        <!-- ~22 чипа -->
    </div>
    <div class="ring-floor"></div>             <!-- световое пятно под кольцом -->
    <div class="ring-hint">Потяните, чтобы покрутить</div>
  </div>
</div>
```

`--cc` на чипе — цвет его группы; он же красит точку `i` и подсветку при наведении.

### Два состояния

Кольцо включается **только при ширине > 900px и без `prefers-reduced-motion`**. В остальных случаях
класс `.on` не ставится, и `.ring` остаётся обычным `flex-wrap` рядом пилюль — та же разметка,
без 3D. Это не деградация, а второй полноценный вид; проверять надо оба.

```css
.ring{position:relative;display:flex;flex-wrap:wrap;gap:9px;justify-content:center}
.ring-in{display:contents}

.ring.on{display:block;height:430px;perspective:1150px;perspective-origin:50% 46%}
.ring.on .ring-in{display:block;position:absolute;left:50%;top:50%;width:0;height:0;
  transform-style:preserve-3d;will-change:transform}
.ring.on .chip3{position:absolute;left:0;top:0;transform-style:preserve-3d;
  will-change:transform,opacity}
```

### Чип

```css
.chip3{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 17px;
  border-radius:999px;font-family:var(--fm);font-size:12px;white-space:nowrap;
  background:linear-gradient(150deg,rgba(255,255,255,.085),rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.11);color:var(--ink2);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22), 0 18px 40px -26px rgba(0,0,0,.95);
  transition:color .4s var(--e),background .4s var(--e),border-color .4s var(--e),box-shadow .4s var(--e)}
.chip3 i{width:6px;height:6px;border-radius:50%;background:var(--cc);box-shadow:0 0 9px var(--cc)}
.chip3.near{color:var(--ink);border-color:color-mix(in srgb,var(--cc) 34%,transparent)}
.chip3:hover{color:#fff;border-color:var(--cc);
  background:linear-gradient(150deg,color-mix(in srgb,var(--cc) 24%,transparent),rgba(255,255,255,.05));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3), 0 0 30px -6px var(--cc), 0 22px 46px -24px rgba(0,0,0,1)}
.chip3.dim{opacity:.28}
```

### Геометрия и кадр

Три яруса. Числа менять можно, но соотношение радиусов важно: средний ярус шире крайних,
иначе кольцо читается как плоский овал.

| Ярус | Чипов | Смещение по Y | Радиус | Фаза |
|---|---|---|---|---|
| верхний | 8 | −86 | 300 | 0° |
| средний | 7 | 0 | 352 | 16° |
| нижний | 7 | +86 | 300 | 32° |

Лишние чипы сверх 22 раскладываются равномерно на радиусе 340 по средней линии.

```js
rot += 0.085;                                  // градусов за кадр, если не пауза и не тянут
var scale = Math.min(1, Math.max(.62, innerWidth/1280));
var a = (m.base + rot) * Math.PI/180, c = Math.cos(a), s = Math.sin(a);
var z = c*m.r*scale, x = s*m.r*scale, f = (c+1)/2;   // f: 0 — дальняя точка, 1 — ближняя
el.style.transform = 'translate(-50%,-50%) translate3d('+x+'px,'+(m.y*scale)+'px,'+z+'px) '
                   + 'scale('+ (0.7 + 0.3*f) +')';
el.style.opacity  = 0.3 + 0.7*f;
el.style.zIndex   = Math.round(c*100) + 120;
el.classList.toggle('near', f > 0.78);         // ближние чипы светлеют
```

Дальний чип уменьшается до 0.7 и гаснет до 0.3 — этим и создаётся глубина, теней тут нет.
`z-index` пересчитывается каждый кадр, иначе ближние чипы уезжают под дальние.

### Взаимодействие

- **Наведение на чип** — вращение встаёт (`paused`), чип поднимается на 12px и растёт в 1.12 раза.
- **Перетаскивание** — `pointerdown` на `.ring`, затем `rot = rot0 + dx * 0.28`. Порог 3px отделяет
  перетаскивание от клика. `setPointerCapture`, чтобы курсор не терялся за краем.
- **Легенда** — наведение или фокус на группе гасит чужие чипы через `.dim`; клик фиксирует
  группу до повторного клика. Обязательно на `focus`/`blur` тоже, иначе с клавиатуры не работает.
- **Пол** — `.ring-floor`: размытый эллипс в цвете `--acc` под кольцом. Единственное место,
  где здесь допустим `filter:blur(30px)`, потому что элемент маленький.

### Производительность

`requestAnimationFrame` только когда кольцо включено; при выключении `cancelAnimationFrame`
и полная очистка инлайновых стилей у чипов. На `resize` — пересинхронизация с задержкой 180 мс.
Меняется только `transform` и `opacity`, оба на композиторе.

---

## 13. Шапка, мобильное меню, знак

**Шапка** `position:fixed`, `z-index:50`, высота `var(--hdr)` = 70px, в состоянии `.stuck`
(появляется при `scrollY > 18`) — 60px. Стекло собрано на псевдоэлементах:
`::before` — заливка `rgba(255,255,255,.04)`, нижняя граница, блик `inset 0 1px 0 rgba(255,255,255,.22)`,
`opacity:.42` → `1` в `.stuck`; `::after` — шум `.02` → `.03`. Сам блюр:
`blur(11px) saturate(122%)` → `blur(14px) saturate(130%)`. Пункт нав подчёркивается линией
`scaleX(0)→scaleX(1)` цвета `--acc` за `.45s`; активный пункт получает класс `.cur` при скролле.

**Переключатель языка** — пилюля с двумя кнопками `[data-lang]`; активная помечена
`aria-pressed="true"` и залита `linear-gradient(120deg,var(--acc-ink),var(--acc2))` с текстом `#05070E`.
Он присутствует и в шапке, и внутри мобильного меню.

**Мобильное меню** (появляется на ≤1020px, где `.nav` скрыт и показан `.burger`):
полноэкранная стеклянная шторка `rgba(7,9,18,.74)` + `blur(14px) saturate(130%)`, пункты
`clamp(1.6rem,8vw,2.3rem)` с номерами `01…06` в цвете акцента, каждый выезжает из
`translateX(-22px)` со ступенькой `60+i*45` мс, подвал (`.mnav-foot`) с переключателем языка и двумя
кнопками появляется с задержкой `.28s`. Блокирует `body`, ловит фокус (Tab закольцован),
закрывается по Esc, по крестику и по клику вне. Бургер превращается в крест через
`transform:translateY(±5.6px) rotate(±45deg)`.

**Знак `>jw_`** — вставляется дословно, четыре места: шапка (34px),
шапка архива (32px), подвал (24px), блок About (52% от квадрата 300px, с тремя вращающимися кольцами
`rot 34s` / `26s reverse`).

```html
<svg class="mark" viewBox="0 0 64 64" fill="none" aria-label="jw.dev">
  <g transform="translate(5,12.89) scale(0.6067)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 29 L11 38.5 L2 48" stroke="var(--acc-ink)" stroke-width="7.4"/>
    <g transform="translate(19,0)" stroke="var(--ink)" stroke-width="8.9">
      <path d="M12 25 V39 C12 44.6 8.4 48.5 3.4 48.5"/>
      <path d="M12 14.5 h.01"/>
      <path d="M18.5 25 L24 48.5 L31 31 L38 48.5 L43.5 25"/>
    </g>
    <rect class="cur" x="74" y="45.5" width="15" height="4.6" rx="1.4" fill="var(--acc-ink)"/>
  </g>
</svg>
```

```css
.mark{width:34px;height:34px;filter:drop-shadow(0 0 12px color-mix(in srgb,var(--acc) 45%,transparent))}
.mark .cur{animation:blk 1.06s steps(1,end) infinite}
@keyframes blk{0%,49%{opacity:1}50%,100%{opacity:0}}
```

**Правило цвета:** шеврон `>` и курсор `_` — `var(--acc-ink)` (меняются вместе с акцентом секции:
циан → индиго → фиолетовый → янтарь → розовый), буквы `jw` — всегда `var(--ink)`.
`steps(1,end)` обязателен: плавное затухание не читается как терминал. При `prefers-reduced-motion`
мигание выключается общим правилом `animation:none!important`.

Рядом со знаком — `.wordmark`: `jw-dev<span class="zone">.pro</span>`, 16.5px,
`font-weight:600`, `letter-spacing:-.03em`, где зона домена приглушена до `--ink3`.
На ≤420px зона скрывается — она съедает место у бургера.

**Отступление от макета (решение владельца от 22.08.2026):** в макете написано `jw.dev`,
а домен — `jw-dev.pro`. Пишем домен: имя в шапке обязано совпадать с адресной строкой,
иначе посетитель видит два разных названия. Литерала в разметке нет — знак режется
из `SITE.name` по последней точке. Тег — `<span>`, а не `<i>`: марка не «иной голос»,
подчёркивать её курсивной семантикой нечем.

Ссылка-логотип **не носит** `aria-label`: доступным именем стал сам словесный знак.
Подпись, расходящаяся с видимым текстом, ломает голосовое управление — человек говорит
«jw-dev.pro», а команда ищет «На главную». Фавикон — тот же знак в `data:image/svg+xml` в `<head>`; в нём цвета
захардкожены (`#22D3EE` для шеврона и курсора, `#F0F4FA` для букв, подложка `#070912`, `rx=14`),
потому что CSS-переменные внутри фавикона не работают.

---

## 14. Нижний док

```css
.dock{position:fixed;left:50%;bottom:20px;z-index:48;display:flex;align-items:center;gap:12px;
  padding:9px 10px 9px 16px;border-radius:999px;max-width:calc(100vw - 24px);
  transform:translate(-50%,140%);opacity:0;
  transition:transform .7s var(--e),opacity .5s var(--e)}
.dock.on{transform:translate(-50%,0);opacity:1}
.dock.on.hid{transform:translate(-50%,150%);opacity:0}
```

Состав слева направо. Док **не** дублирует шапку — шапка это переходы по разделам, док это действия:

1. **Кольцо прогресса** 34×34, `stroke-dasharray:88`, `stroke-dashoffset` от 88 до 0
   (`transition:.25s linear`), внутри процент моно 9px; рядом — «Сейчас читаете» + название раздела.
2. **Контекстное действие** — ровно одно, меняется вместе с секцией:

   | Секция | Действие | Ключ | Иконка |
   |---|---|---|---|
   | hero, stats, services | Смотреть кейсы | `dock.ctx.work` | `i-arr` |
   | work | Открыть разбор кейса | `dock.ctx.case` | `i-doc` |
   | stack, process, about, faq | Как я работаю | `dock.ctx.how` | `i-bolt` |
   | journal | Все записи (открывает архив) | `dock.ctx.log` | `i-doc` |
   | contact, kit | Скопировать почту (с тостом) | `dock.ctx.mail` | `i-mail` |

3. **Живой бот** — постоянная иконочная кнопка на `https://t.me/jw_social_Downloader_bot` с тултипом.
4. **Написать** — постоянная primary-пилюля к форме.

Логика показа: появляется после `scrollY > innerHeight*0.55`; прячется при скролле вниз и
возвращается при скролле вверх с гистерезисом (накопитель `dkAcc`, порог `+110` на скрытие,
`-60` на показ); в конце страницы (`p>0.985`) всегда показан. Скрыт, когда открыты разбор кейса,
архив или мобильное меню. На ≤640px: `bottom:44px`, подписи и блок «Сейчас читаете» скрыты,
кнопки становятся круглыми 38×38.

---

## 15. Оверлеи: разбор кейса и архив

**Разбор кейса `.ovl`** (`z-index:80`) — фон `rgba(4,6,14,.72)` + `blur(14px) saturate(120%)`,
панель `.ovl-p` до 1000px, `border-radius:28px`, въезжает `translateY(26px) scale(.985)` → `none`
за `.55s`. Структура: моно-строка `/work/<slug>`, H2, тип, три чипа-метрики, крупный слот скриншота
(`aspect-ratio:16/8`), две колонки — `Задача / Что сделал / Результат` и сайдбар (стек, ссылка,
кнопка «Обсудить похожий проект»), внизу навигация `Назад / 01 / 06 / Дальше`.
Крестик `.ovl-x` 40×40 поворачивается на 90° на ховере. Закрытие: крестик, Esc, клик по фону.
`body` блокируется, фокус ловится внутри, граф останавливается.

**Архив `.arc`** (`z-index:78`) — «страница» `/log` поверх сайта: фон `rgba(5,7,16,.9)` + блюр,
липкая верхняя панель со знаком, словом `jw.dev`, моно-меткой `/log` и крестиком; заголовок,
подпись, табы `Все / Кейсы / Заметки / Апдейты` со счётчиками, лента и состояние «пусто».
Разбор кейса открывается **поверх** архива: при закрытии разбора `body` остаётся заблокированным,
если архив ещё открыт (`D.body.style.overflow=(arcOpen||menuOpen)?'hidden':''`).

### Отступление от макета: архив — страница, а не оверлей (22.08.2026, решение владельца)

В макете сайт живёт на одном адресе, поэтому архив и пришлось делать оверлеем. В проекте
`/log/` — настоящая страница: у неё свой адрес, свой `<title>`, своё превью в мессенджере
и своё место в sitemap. Оверлей поверх неё был бы вторым списком строк со своими фильтрами
и счётчиками, который обязан не разойтись с первым, — и это при том, что описан он в §15
ровно словами «страница `/log` поверх сайта».

Что осталось от `.arc`: сама лента, табы со счётчиками и состояние «под фильтром пусто» —
они переехали на страницу как есть. Что ушло: `z-index`, блюр-подложка, липкая панель
с крестиком, блокировка `body` и правило про разбор кейса поверх архива. Кнопка «Все записи»
на главной и контекстное действие дока — обычные ссылки на `/log/`.

Разбор кейса оверлеем **остаётся**: он открывается с главной, где карточка уже на экране,
и мгновенность там и есть смысл механики. Архив открывается вместо главной, а не поверх неё.

---

## 16. Тайминги и easing

**Единственный easing проекта:** `--e: cubic-bezier(.16,1,.3,1)`. Ничего пружинящего.

| Что | Длительность |
|---|---|
| Смена акцента `--acc`/`--acc2` | 900 мс |
| Появление `.rv` (opacity + `translateY(16px)`) | 750 мс, ступенька `70 мс` (`index%6`) |
| Предохранитель `.rv` | `html.rvall` через 1200 мс, дублирующий `setTimeout` — 1300 мс; при срабатывании `transition:none!important` (иначе элементы «доезжали» бы ещё 750 мс) |
| Кнопки: transform / box-shadow | 450 мс; фон и цвет — 350 мс |
| Карточки (`.case`, `.svc`, `.pstep`) | 600 мс |
| Стекло окна `.win-body` (тень на ховере) | 600 мс |
| Слот скриншота (`scale`, вуаль) | 800 мс |
| `.irid` — появление рамки / бег градиента | 550 мс / `slide 9s linear infinite` |
| `.btn.trav` — бег градиента | `slide 2.6s linear infinite` |
| Переливающееся слово в H1 | `slide 7.5s linear infinite` |
| Мигание курсора знака | `blk 1.06s steps(1,end) infinite` |
| Пульс `.dot.live` | `pls 2.2s infinite` |
| Гало активного узла процесса | `halo 2.4s ease-out infinite` |
| Импульс процесса — полный проход | 12 000 мс |
| Спавн импульса графа | не чаще 820 мс, максимум 10 одновременно |
| Пересчёт геометрии графа | каждые 560 мс |
| Дрейф окон героя / кристаллов | 11–21 с, `ease-in-out alternate` |
| Дрейф пятен ауроры | 32–45 с, `alternate` |
| Бегущая строка стека | `mv 42s linear infinite`, пауза по ховеру |
| Счётчики цифр | 1100 мс, `easeOutCubic` |
| Кольцо прогресса в доке | `.25s linear` |
| Появление/скрытие дока | 700 мс transform, 500 мс opacity |
| Оверлеи | фон `.45s`, панель `.55s`, снятие класса `open` — через 460 мс |
| Мобильное меню | фон `.4s`, пункты `.5s` со ступенькой 45 мс, подвал `.5s` с задержкой `.28s` |
| Тост | показ `.5s`, авто-скрытие через 2600 мс |
| Аккордеон FAQ | `.6s` (см. отступление ниже: высоту ведёт `grid-template-rows`, не `max-height`) |
| Фильтр кейсов | исчезновение 260 мс, затем `hidden`; счётчик обновляется через 280 мс |
| Спиннер | `spin1 .8s linear infinite`; скелетон — `shim 1.6s linear infinite` |


### Отступление от макета: аккордеон на `<details>` (25.08.2026)

В макете пункт FAQ — это `<button aria-expanded>` плюс класс `.open`, а высота ответа
едет `max-height` от `0` до `340px`. В проекте пункт — настоящий `<details name="faq">`.
Причина та же, что у шторки разделов в §13: без JS ответы обязаны раскрываться, а общий
атрибут `name` даёт нативный аккордеон — открытый пункт закрывает соседей, и скрипт
на этой секции не нужен вовсе.

Вместе с разметкой поменялся и способ анимации. Ответы владельца длиннее макетных:
`340px` обрезали бы часть из них молча, а поднять число под самый длинный ответ значит
привязать стиль к тексту, который ещё будут править. Высоту ведёт `grid-template-rows`
от `0fr` к `1fr` на `::details-content` — она едет до фактической высоты содержимого.
Длительность `.6s` и easing гайда сохранены, `content-visibility` переводится
с `allow-discrete`, иначе закрытие не проигрывается.

Что это меняет в §18: три правила про `.acc-a` и `max-height` в блоке reduced-motion
заменены одним — `.acc-i::details-content{transition:none}`. Класса `.open` у `<details>`
нет, и правила гайда прятали бы ответ насовсем.

Строка ответа ограничена `74ch`. В макете аккордеон делил ряд с таблицей пакетов и был
вдвое уже; таблицы у нас нет (решение владельца, «Чего делать не надо» в плане),
и на 1440px строка вышла бы под 140 знаков.

---

## 17. Брейкпоинты

| Ширина | Что происходит |
|---|---|
| **≤1180px** | окна и HUD героя ужимаются и переставляются |
| **≤1020px** | десктопная нав скрыта, появляется бургер; primary-кнопка из шапки убрана; услуги в одну колонку, featured без подъёма; кристаллы скрыты; кейсы 2 колонки; about / форма / FAQ+таблица / разбор кейса — одна колонка; статистика 2 колонки |
| **≤900px** | герой в одну колонку с `.hero-l{order:-1}`; сцена статична, каустики скрыты, HUD в ряд; процесс — вертикальная рельса вместо SVG; кольцо стека выключается (`sync()` требует `innerWidth>900`) |
| **≤680px** | кейсы 1 колонка; статистика 2 колонки; набор 1 колонка; строки журнала переносятся, стрелка скрыта; таблица мельче; тост во всю ширину |
| **≤640px** | док: только кольцо, иконка контекста и главная кнопка (`bottom:44px`, кнопки 38×38) |
| **≤420px** | кнопки героя во всю ширину; статистика 1 колонка; шапка архива 56px |

Нижняя граница поддержки — 390px, верхняя — 1920px (контент упирается в `max-width:1260px`).

---

## 18. Пол доступности

- `:focus-visible{outline:2px solid var(--acc-ink);outline-offset:3px;border-radius:6px}` — глобально.
  Именно `--acc-ink`: обводка — нетекстовый элемент, ей нужны 3:1, а `--acc` в индиго-секциях
  даёт на стекле 2,92.
- Ссылка «Skip to content» (`.skip`) выезжает по фокусу на `top:12px`.
- Класс `.sr` для визуально скрытого текста (используется в `<caption>` таблицы).
- Иконочные кнопки имеют `aria-label`; переводимые лейблы — через `data-i18n-al`.
- Переключатели состояния используют `aria-pressed` (язык, фильтры, сегментед, тумблер, акцент),
  шаги процесса — `aria-current`, счётчик найденного — `aria-live="polite"`, тост — `role="status"`.
- Оверлеи: `role="dialog" aria-modal="true"`, `aria-labelledby`, ловушка Tab, Esc, возврат фокуса
  на элемент, с которого открыли, блокировка `body`.
- Контраст: абзацы не тусклее `--ink2` (`rgba(240,244,250,.72)`). `--ink3` (.56) — только для
  моно-подписей 10–12px. Текст на светлых заливках — `#05070E`.
- **Пол контраста задаёт не фон, а аврора.** На плоском `--bg` `--ink3` даёт 5,95:1, а на стыке
  двух пятен в верхней трети экрана — 4,78:1 при пороге 4,5. Поэтому верхняя ступень линейного
  градиента `#veil` — `rgba(7,9,18,.42)`, а не `.30` из макета: она возвращает подписи 5,08,
  а абзацам 7,39. Ставить моно-подписи в первый экран без проверки нельзя.
- Ховер живёт только под `@media (hover: hover) and (pointer: fine)`. На тач-экране `:hover`
  срабатывает по тапу и залипает: карточка остаётся поднятой, рамка — зажжённой.
- Мобильное меню, разбор кейса и архив обязаны возвращать `document.body.style.overflow`.

Полный блок reduced-motion — вставлять как есть:

```css
@media (prefers-reduced-motion:reduce){
*,*::before,*::after{animation:none!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
.rv{opacity:1!important;transform:none!important}
#light{display:none}
.marq-in{transform:none}
.win,.stage-in,.plane{transform:none!important}
.acc-a{max-height:none}
.acc-i:not(.open) .acc-a{max-height:0}
.acc-i.open .acc-a{max-height:400px}
}
```

**Граф при reduced-motion не прячется** (отступление от макета, решение владельца от 22.08.2026).
В макете он уходил в `display:none` вместе со светом за курсором. Но §5 требует, чтобы под стеклом
была видимая структура, а нити `data-nx` — единственное, что привязывает карточки к фону: без них
посетитель с выключенной анимацией получает не спокойную версию дизайна, а версию без него.
Вместо цикла `graph.js` рисует один кадр (`staticFrame()`) — без искр и без мерцания узлов —
и перерисовывает его при прокрутке и смене акцента. Канвас фиксирован, а якоря привязаны
к элементам, которые уезжают: это не анимация, а то же самое, что делает любой `fixed`-слой.
Свет за курсором (`#light`) остаётся выключенным — он и есть движение.

Плюс в JS: `RM` проверяется до запуска графа, параллакса, кольца стека, импульса процесса и
анимации счётчиков; скролл к якорям становится `behavior:'auto'`.

---

## Открытые вопросы

- ~~**Плейсхолдеры контактов.**~~ Закрыто 25.08.2026. Telegram владельца — `@jw_dev_pro`,
  он стоит в подвале, в колонке контактов и в форме. Почты на сайте нет ни одной: временный
  ящик знает только сервер, а корпоративная появится вместе с доменом. Поэтому нет и кнопки
  копирования почты из §14 — копировать нечего.
- **Скриншоты вместо CSS-макетов.** В прототипе слот `.shot` заполнен нарисованной на CSS
  мини-вёрсткой, потому что внешних картинок в одном файле быть не могло. В проде туда встают
  реальные локальные изображения (формат — в отдельном файле про кейсы); слои `.shot-veil` / `.shot-tint` /
  `.shot-gloss` и вся геометрия слота остаются без изменений. Точный формат (WebP/AVIF), способ
  генерации превью и нужен ли `<picture>` — не решены.
- **Однофайловость.** Правило «один `.html` со всем инлайном» относилось к макету. Как раскладывать
  прод (один файл, разделённые ассеты, сборка) — не решено; неизменны только «ноль внешних запросов»
  и «ноль библиотек».

---

## Границы этого файла

Здесь нет и не должно быть: состава разделов сайта, роутов, метаданных, стратегии языка в URL,
хостинга, сборки. Это решает владелец, и в макете `13-final.html` они присутствуют лишь как
демонстрация дизайна, а не как утверждённая структура.

Копия текстов (заголовки, описания кейсов, услуги, FAQ) живёт в словаре `DICT` внутри макета —
берётся оттуда дословно, переписывать «чтобы лучше звучало» нельзя.
