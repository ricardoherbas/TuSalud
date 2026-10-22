
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV OCR_LANGUAGES=spa+eng

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-spa \
        tesseract-ocr-eng \
        poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY ocr/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY ocr/app.py ./app.py

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
