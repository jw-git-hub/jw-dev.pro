# Приёмник формы. Секретов в образе нет — они приходят из .env при запуске.
FROM python:3.13-alpine

WORKDIR /app

# Без этого stdout буферизуется блоками, потому что docker logs — не терминал,
# и строки об отказе доставки копятся в памяти вместо журнала контейнера.
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ./

# Процесс не от root: контейнер смотрит в интернет через Nginx.
RUN adduser -D -H contact
USER contact

EXPOSE 8080
CMD ["python", "app.py"]
