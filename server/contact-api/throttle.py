"""Лимит заявок с одного адреса.

Счётчик в памяти процесса: контейнер один, а переживать его перезапуск лимиту
незачем — перезапуск и так реже, чем окно.
"""

import time

WINDOW_SECONDS = 3600


class Throttle:
    def __init__(self, limit: int) -> None:
        self._limit = limit
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str) -> bool:
        """Отмечает попытку и говорит, укладывается ли адрес в лимит."""
        self._forget_expired()
        hits = self._hits.setdefault(key, [])

        if len(hits) >= self._limit:
            return False

        hits.append(time.monotonic())
        return True

    def _forget_expired(self) -> None:
        """Чистим весь словарь, а не только текущий адрес: иначе он растёт вечно."""
        now = time.monotonic()
        self._hits = {
            key: [hit for hit in hits if now - hit < WINDOW_SECONDS]
            for key, hits in self._hits.items()
            if any(now - hit < WINDOW_SECONDS for hit in hits)
        }
