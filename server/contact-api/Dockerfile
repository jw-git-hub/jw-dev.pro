# Приёмник формы. Секретов в образе нет — они приходят из .env при запуске.
FROM python:3.13-alpine

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ./

# Процесс не от root: контейнер смотрит в интернет через Nginx.
RUN adduser -D -H contact
USER contact

EXPOSE 8080
CMD ["python", "app.py"]
