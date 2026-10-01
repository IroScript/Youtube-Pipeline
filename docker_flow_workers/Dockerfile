# Dockerfile for Google Flow (Veo 3.1) Automation Workers
FROM docker_workers-worker-1:latest

WORKDIR /app

# Ensure directory structure
RUN mkdir -p /app/downloads /app/profile /app/cookies /app/10SecNewExtension

# Set environment defaults
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:99 \
    FLOW_URL="https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d"

# Copy requirements if additional packages needed
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy extension
COPY 10SecNewExtension /app/10SecNewExtension

# Copy server code
COPY flow_worker_server.py /app/flow_worker_server.py

# Launch Xvfb virtual display and Uvicorn FastAPI server
CMD ["sh", "-c", "rm -f /tmp/.X99-lock && Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset & uvicorn flow_worker_server.py:app --host 0.0.0.0 --port ${PORT:-8000}"]
