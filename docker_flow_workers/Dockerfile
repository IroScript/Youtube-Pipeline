# Dockerfile for Google Flow (Veo 3.1) Automation Workers
FROM docker_workers-worker-1:latest

WORKDIR /app

# Ensure directory structure
RUN mkdir -p /app/downloads /app/profile /app/cookies /app/10SecNewExtension /app/temp /app/database

# Set environment defaults
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:99 \
    FLOW_URL="https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d" \
    PORT=8102 \
    DB_PATH="/app/database/youtube_pipeline.db" \
    DOWNLOADS_DIR="/app/downloads" \
    TEMP_DIR="/app/temp" \
    PROFILE_DIR="/app/profile" \
    EXTENSION_DIR="/app/10SecNewExtension"

# Copy requirements if additional packages needed
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy extension
COPY 10SecNewExtension /app/10SecNewExtension

# Copy core worker modules
COPY flow_queue_manager.py /app/flow_queue_manager.py
COPY browser_supervisor.py /app/browser_supervisor.py
COPY flow_worker_server.py /app/flow_worker_server.py

# Launch Xvfb virtual display and Uvicorn FastAPI server on internal port 8102
CMD ["sh", "-c", "rm -f /tmp/.X99-lock && Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset & uvicorn flow_worker_server.py:app --host 0.0.0.0 --port ${PORT:-8102}"]
