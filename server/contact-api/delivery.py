"""Доставка заявки: Telegram обязателен, почта — дубль, если она настроена."""

import asyncio
import html
import smtplib
from email.message import EmailMessage

import aiohttp

from config import (
    BOT_TOKEN,
    CHAT_ID,
    MAIL_TO,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USER,
)
from submission import Submission

TELEGRAM_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
LABELS = {
    "name": "Имя",
    "contact": "Связь",
    "link": "Сайт",
    "kind": "Что нужно",
    "task": "Подробности",
}


def as_text(submission: Submission) -> str:
    """Заполненные поля по строке. Пустые не пишем — они ничего не сообщают."""
    lines = [
        f"{LABELS[field]}: {value}"
        for field, value in submission.values.items()
        if value
    ]
    return "\n".join(lines)


async def to_telegram(session: aiohttp.ClientSession, submission: Submission) -> None:
    """Экранируем всё, что пришло из формы: заявка — чужой текст, а не разметка."""
    body = html.escape(as_text(submission))
    text = f"<b>Заявка с сайта</b> ({submission.locale})\n\n{body}"

    async with session.post(
        TELEGRAM_URL,
        json={"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML"},
        timeout=aiohttp.ClientTimeout(total=10),
    ) as response:
        response.raise_for_status()


def _send_mail(submission: Submission) -> None:
    message = EmailMessage()
    message["Subject"] = f"Заявка с jw-dev.pro ({submission.locale})"
    message["From"] = SMTP_USER
    message["To"] = MAIL_TO
    message.set_content(as_text(submission))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(message)


async def to_mail(submission: Submission) -> None:
    """SMTP синхронный — уводим его в поток, чтобы не держать цикл событий."""
    if not (SMTP_HOST and MAIL_TO):
        return
    await asyncio.to_thread(_send_mail, submission)
