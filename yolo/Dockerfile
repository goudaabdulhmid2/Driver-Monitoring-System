# Base image optimized for Python
FROM python:3.10-slim

# Set piwheels for ARM performance (pre-compiled binaries for Pi)
ENV PIP_EXTRA_INDEX_URL=https://www.piwheels.org/simple

# Install system dependencies needed for OpenCV and NCNN
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install first (leverage Docker cache)
COPY requirements.txt .
RUN pip install --default-timeout=1000 --retries=10 --no-cache-dir -r requirements.txt

# Copy all yolo scripts and models
COPY . .

# Expose Flask Port (5001 as configured in main.py/docker-compose)
EXPOSE 5001

# Run the detection script
CMD ["python3", "main.py"]
