@echo off
title Wrench Wise Project Lab - Executive Gateway
echo ======================================================================
echo           WRENCH WISE PROJECT LAB - 1-CLICK LAUNCHER
echo ======================================================================
echo.
echo [1/3] Checking Python installation...
python --version
if errorlevel 1 (
    echo [ERROR] Python is not found on your PATH. Please install Python 3.10+
    pause
    exit /b 1
)

echo.
echo [2/3] Checking required packages...
pip install --quiet fastapi uvicorn scikit-learn pandas numpy pypdf pytest reportlab python-multipart pillow onnxruntime

echo.
echo [3/3] Starting Unified Gateway on http://localhost:8080 ...
start "" "http://localhost:8080"
python gateway.py

pause
