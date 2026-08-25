"""Проверка приёмника заявок: ответы, ловушка, секундомер, лимит, доставка.

Запуск: `python3 server/contact-api/test_app.py`. Отдельного бегунка тестов
у приёмника нет намеренно — один файл, тринадцать проверок и нулевой код
возврата понятнее, чем pytest ради одного модуля.

Telegram и почта подменяются: проверяется решение приёмника, а не то,
умеет ли Telegram принимать сообщения.
"""
import asyncio
import os
import pathlib
import sys
import time

os.environ.update(TELEGRAM_BOT_TOKEN="x", TELEGRAM_CHAT_ID="1", RATE_LIMIT_PER_HOUR="3")
sys.path.insert(0, str(pathlib.Path(__file__).parent))

import delivery
from aiohttp.test_utils import TestClient, TestServer
import app as api

# Каждый сценарий ходит со своего адреса: лимит считается по адресу,
# и общий на всех превратил бы проверки в очередь друг за другом.
ip = iter(f"10.0.0.{n}" for n in range(1, 999))

def json_from(address):
    return {"Accept": "application/json", "X-Forwarded-For": address}

sent = []

async def fake_telegram(session, submission):
    sent.append(submission)

async def fake_mail(submission):
    pass

api.to_telegram = fake_telegram
api.to_mail = fake_mail

async def main():
    client = TestClient(TestServer(api.create_app()))
    await client.start_server()
    ok = True

    def check(name, got, want):
        nonlocal ok
        mark = "✓" if got == want else "✗"
        if got != want: ok = False
        print(f"  {mark} {name}: {got!r}" + ("" if got == want else f" (ждали {want!r})"))

    # 1. Обычная заявка без JS — редирект на страницу ответа своего языка.
    r = await client.post("/api/contact", data={"contact": "@user", "locale": "ru"},
                          allow_redirects=False, headers={"X-Forwarded-For": next(ip)})
    check("без JS: статус", r.status, 303)
    check("без JS: куда", r.headers["Location"], "/ru/sent/")
    check("доставлено в Telegram", len(sent), 1)

    # 2. Тот же запрос от скрипта — JSON, а не редирект.
    r = await client.post("/api/contact", data={"contact": "mail@example.com", "locale": "en"},
                          headers=json_from(next(ip)))
    check("со скриптом: статус", r.status, 200)
    check("со скриптом: тело", await r.json(), {"ok": True})

    # 3. Без обратного адреса — отказ.
    r = await client.post("/api/contact", data={"contact": "", "locale": "en"},
                          headers=json_from(next(ip)))
    check("без контакта: статус", r.status, 400)

    # 4. Ловушка заполнена — робот получает «успех», заявка не уходит.
    before = len(sent)
    r = await client.post("/api/contact", data={"contact": "@bot", "company": "Acme"},
                          headers=json_from(next(ip)))
    check("ловушка: ответ", r.status, 200)
    check("ловушка: не доставлено", len(sent), before)

    # 5. Форма заполнена мгновенно — то же самое.
    before = len(sent)
    r = await client.post("/api/contact",
                          data={"contact": "@fast", "started": str(int(time.time() * 1000))},
                          headers=json_from(next(ip)))
    check("секундомер: не доставлено", len(sent), before)

    # 6. Человек, заполнявший минуту, проходит.
    before = len(sent)
    await client.post("/api/contact",
                      data={"contact": "@slow", "started": str(int((time.time() - 60) * 1000))},
                      headers=json_from(next(ip)))
    check("человек проходит", len(sent), before + 1)

    # 7. Лимит: три заявки в час с адреса, четвёртая молча отбрасывается.
    before = len(sent)
    spammer = next(ip)
    for _ in range(4):
        await client.post("/api/contact", data={"contact": "@spam"},
                          headers=json_from(spammer))
    check("лимит 3/час", len(sent) - before, 3)

    # 8. Экранирование: заявка — чужой текст, а не разметка.
    check("экранирование", delivery.html.escape("<b>x</b>"), "&lt;b&gt;x&lt;/b&gt;")

    # 9. Длинный текст обрезается, а не уходит целиком.
    from submission import parse
    check("обрезка task", len(parse({"task": "a" * 9000}).values["task"]), 4000)

    await client.close()
    print("\nВСЁ ЗЕЛЁНОЕ" if ok else "\nЕСТЬ ПАДЕНИЯ")
    return 0 if ok else 1

sys.exit(asyncio.run(main()))
