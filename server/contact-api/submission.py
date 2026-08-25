"""Разбор и проверка заявки.

Проверка на сервере не дублирует браузерную, а заменяет её: на этот адрес
приходят и запросы мимо формы, где никаких `required` не было.
"""

import time
from dataclasses import dataclass

from config import MIN_FILL_SECONDS

FIELDS = ("name", "contact", "link", "kind", "task")
MAX_LENGTH = {"name": 80, "contact": 120, "link": 200, "kind": 80, "task": 4000}
LOCALES = ("en", "ru")


@dataclass(frozen=True)
class Submission:
    locale: str
    values: dict[str, str]

    @property
    def contact(self) -> str:
        return self.values["contact"]


def parse(payload) -> Submission:
    """Собирает заявку из полей формы, обрезая всё лишнее по длине."""
    values = {
        field: str(payload.get(field, "")).strip()[: MAX_LENGTH[field]] for field in FIELDS
    }
    locale = str(payload.get("locale", "en"))
    return Submission(locale=locale if locale in LOCALES else "en", values=values)


def looks_automated(payload) -> bool:
    """Ловушка и секундомер. Оба признака — про робота, а не про ошибку человека."""
    if str(payload.get("company", "")).strip():
        return True

    started = str(payload.get("started", "")).strip()
    if not started.isdigit():
        return False

    filled_for = time.time() - int(started) / 1000
    return 0 <= filled_for < MIN_FILL_SECONDS


def is_valid(submission: Submission) -> bool:
    """Единственное обязательное поле — обратный адрес: без него отвечать некуда."""
    return bool(submission.contact)
