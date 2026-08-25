# jw-dev.pro

Сайт-визитка разработчика: кейсы, журнал, контакты. Статика на Astro, без фреймворка
в браузере.

## Запуск

```bash
npm ci
npm run dev
```

Прод-сборка:

```bash
npm run build && npm run preview
```

## Ворота

```bash
npm run lint     # ESLint + Stylelint + Prettier
npm run check    # контент, переводы, инлайн, HTML, ссылки, бюджет веса
```

Приёмник формы живёт в этом же репозитории и проверяется отдельно:

```bash
pip install -r server/contact-api/requirements.txt
python server/contact-api/test_app.py
```

Все три команды выполняет CI на каждый push. Красное — деплоя нет.

## Документы

- `CLAUDE.md` — правила проекта
- `docs/ARCHITECTURE.md` — как всё устроено
- `docs/DESIGN-GUIDE.md` — визуальный язык, обязателен к исполнению
- `docs/CONTENT-CASES.md` — схема кейса и регламент скриншотов
- `JOURNAL.md` — хронология разработки
