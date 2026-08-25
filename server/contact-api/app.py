"""Приёмник формы jw-dev.pro.

Один маршрут: `POST /api/contact`. Отвечает по-разному в зависимости от того,
кто спрашивает. Браузеру без JS — редирект на страницу ответа сайта, потому
что показать текст ему больше негде. Скрипту — JSON, потому что редирект
`fetch` проглотит и отличить успех от отказа станет нечем.

Заявка, похожая на робота, получает тот же ответ, что и настоящая: узнав
об отказе, робот начнёт подбирать обход.
"""

import logging

import aiohttp
from aiohttp import web

import submission as form
from config import PORT, RATE_LIMIT_PER_HOUR
from delivery import to_mail, to_telegram
from throttle import Throttle

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("contact")

SESSION = web.AppKey("session", aiohttp.ClientSession)
THROTTLE = web.AppKey("throttle", Throttle)


def answer_path(locale: str, ok: bool) -> str:
    page = "/sent/" if ok else "/not-sent/"
    return page if locale == "en" else f"/{locale}{page}"


def wants_json(request: web.Request) -> bool:
    return "application/json" in request.headers.get("Accept", "")


def reply(request: web.Request, locale: str, ok: bool) -> web.Response:
    if wants_json(request):
        return web.json_response({"ok": ok}, status=200 if ok else 400)
    return web.HTTPSeeOther(answer_path(locale, ok))


def client_ip(request: web.Request) -> str:
    """За Nginx настоящий адрес приходит заголовком — remote там всегда локальный."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    return forwarded.split(",")[0].strip() or (request.remote or "unknown")


async def contact(request: web.Request) -> web.Response:
    payload = await request.post()
    submitted = form.parse(payload)

    # Лимит стоит первым: он самый дешёвый и прикрывает собой всё остальное,
    # а заодно расходуется на роботах — им поток заявок нужнее, чем человеку.
    if not request.app[THROTTLE].allow(client_ip(request)):
        log.info("заявка отброшена: лимит по адресу")
        return reply(request, submitted.locale, ok=True)

    if form.looks_automated(payload):
        log.info("заявка отброшена: ловушка или секундомер")
        return reply(request, submitted.locale, ok=True)

    if not form.is_valid(submitted):
        return reply(request, submitted.locale, ok=False)

    try:
        await to_telegram(request.app[SESSION], submitted)
    except Exception:
        log.exception("заявка не доставлена в Telegram")
        return reply(request, submitted.locale, ok=False)

    try:
        await to_mail(submitted)
    except Exception:
        # Телеграм уже принял: терять заявку из-за почты нельзя.
        log.exception("дубль на почту не ушёл")

    return reply(request, submitted.locale, ok=True)


async def health(_: web.Request) -> web.Response:
    return web.Response(text="ok")


async def session_lifecycle(app: web.Application):
    app[SESSION] = aiohttp.ClientSession()
    yield
    await app[SESSION].close()


def create_app() -> web.Application:
    app = web.Application()
    app[THROTTLE] = Throttle(RATE_LIMIT_PER_HOUR)
    app.cleanup_ctx.append(session_lifecycle)
    app.add_routes([web.post("/api/contact", contact), web.get("/api/health", health)])
    return app


if __name__ == "__main__":
    web.run_app(create_app(), port=PORT, access_log=None)
