# Base image optimized for Python
FROM python:3.10-slim

# Install system dependencies needed for OpenCV, ncnn and camera access
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all yolo scripts and models
COPY . .

# Expose Flask Port
EXPOSE 5000

# Run the detection script
CMD ["python3", "main.py"]
