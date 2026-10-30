# Production Dockerfile for Wrench Wise Project Lab on Render
FROM node:22-bookworm-slim

WORKDIR /app

# Install system dependencies & Python 3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python ML/AI requirements
RUN pip3 install --no-cache-dir --break-system-packages \
    fastapi \
    uvicorn \
    scikit-learn \
    pandas \
    numpy \
    pypdf \
    pillow \
    onnxruntime \
    python-multipart \
    pytest

# Copy application files
COPY package*.json ./
COPY . .

# Ensure startup script is executable
RUN chmod +x start.sh

# Environment variables
ENV PORT=10000
ENV NODE_ENV=production
ENV OPENBLAS_NUM_THREADS=1
ENV OMP_NUM_THREADS=1

# Expose Render standard port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT}/api/system/status || exit 1

# Launch both Python Gateway and Node Server
CMD ["./start.sh"]
