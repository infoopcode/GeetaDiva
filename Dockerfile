FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HUB_DISABLE_SYMLINKS_WARNING=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first so requirements.txt does not pull the huge CUDA build
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch

COPY requirements.txt .
RUN pip install -r requirements.txt

# Includes the local MMS-TTS models (models/) so TTS works offline on the server
COPY . .

# models/ is gitignored, so fetch the VITS models into the image at build time.
# (They end up inside the image even though they are not in the repo.)
RUN python download_models.py

EXPOSE 5000

# 1 worker keeps all VITS models loaded in a single process (saves RAM);
# threads handle concurrent requests. --timeout 120 covers slow model warm-up.
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--timeout", "120"]
