# python-agent/Dockerfile
FROM python:3.11-slim
# slim = Python + minimal OS. No dev tools. Smaller image.
# Full python:3.11 includes compilers, headers — not needed to run

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# --no-cache-dir = don't cache pip downloads in image
# Keeps image smaller by ~50MB

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# uvicorn = production ASGI server for FastAPI
# --host 0.0.0.0 = accept connections from any IP
# Without this: only accepts connections from localhost
# Inside Docker, "localhost" is the container itself
# 0.0.0.0 means "accept from outside the container too" = required for Railway