"""Настройки приёмника: всё из окружения, значений по умолчанию для секретов нет.

Почта получателя живёт здесь и только здесь. Репозиторий сайта публичный,
поэтому адрес не попадает ни в разметку, ни в код — он приходит из `.env`,
который лежит на сервере и в git не отслеживается.
"""

import os

BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

# Дубль на почту необязателен: пока SMTP не настроен, заявка идёт только в Telegram.
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
MAIL_TO = os.environ.get("MAIL_TO", "")

RATE_LIMIT_PER_HOUR = int(os.environ.get("RATE_LIMIT_PER_HOUR", "5"))

# Человек не заполняет форму быстрее этого. Проверка работает только когда
# у заявки есть отметка времени — её ставит скрипт, без JS её нет.
MIN_FILL_SECONDS = 3

PORT = int(os.environ.get("PORT", "8080"))
