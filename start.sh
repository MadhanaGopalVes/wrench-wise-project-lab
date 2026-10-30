#!/bin/sh
set -e

echo "=========================================================="
echo "    Starting Wrench Wise Project Lab on Render Container"
echo "=========================================================="

export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
export NUMEXPR_NUM_THREADS=1

# Start Python FastAPI Gateway on internal 127.0.0.1:8080 in background
echo "[1/2] Starting Python Unified AI Gateway on port 8080..."
python3 gateway.py &
GATEWAY_PID=$!

# Wait for Gateway to initialize
sleep 2

# Start Node.js Web Server on public $PORT in foreground
echo "[2/2] Starting Node.js Server on port ${PORT:-3000}..."
exec node --disable-warning=ExperimentalWarning server/index.js
