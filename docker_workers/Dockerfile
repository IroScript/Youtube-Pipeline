# Dockerfile for Database Fillup (ChatGPT Automation) Worker
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Ensure directory structure
RUN mkdir -p /app/cookies /app/profile /app/temp /app/database

# Set environment defaults
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:99 \
    PORT=8000 \
    WORKER_ID=worker_1 \
    COOKIE_FILE="/app/cookies/cookie.json" \
    PROXY_FILE="/app/cookies/proxy.txt" \
    PROFILE_DIR="/app/profile" \
    CHATGPT_URL="https://chatgpt.com"

# Install requirements
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy server code
COPY worker_server.py /app/worker_server.py

# Launch Xvfb virtual display and Uvicorn FastAPI server on internal port 8000
CMD ["sh", "-c", "rm -f /tmp/.X99-lock && Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset & uvicorn worker_server:app --host 0.0.0.0 --port ${PORT:-8000}"]
