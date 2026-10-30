# AI Image Classifier (Deep CNN) · Wrench Wise Project Lab

A standalone, fully functional Computer Vision classification system built with **FastAPI**, **ONNX Runtime**, **Pillow**, and modern browser UI.

Learners explore deep learning image classification on 1,000 ImageNet categories, inspect input tensor formatting ($NCHW$), evaluate real neural network inference latencies (sub-15ms), analyze Softmax confidence distributions, and diagnose model uncertainty through Shannon Entropy.

---

## 1. Directory Structure

```text
projects/ai-image-classifier/
├── backend/
│   ├── main.py                   # FastAPI REST API & static server (Port 8005)
│   ├── vision_service.py         # ImageNet preprocessing & ONNX Runtime CNN inference
├── models/
│   ├── squeezenet.onnx           # Lightweight SqueezeNet 1.1 ONNX deep learning model
│   └── imagenet_classes.json     # 1,000 ImageNet category labels
├── sample-images/                # Benchmark test images (retriever, sports car, etc.)
├── frontend/
│   ├── index.html                # Interactive UI with drag-drop, preview & distribution charts
│   ├── app.js                    # Controller & telemetry visualizer
│   └── style.css                 # Clean Wrench Wise design tokens
├── tests/
│   └── test_vision.py            # Automated pytest suite (7 test cases)
└── README.md
```

---

## 2. Quickstart & Execution

### Prerequisites
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `onnxruntime`, `Pillow`, `numpy`, `pytest`

### Step 1: Run Automated Tests
```bash
pytest projects/ai-image-classifier/tests/test_vision.py -v
```
All 7 test cases verify model loading, tensor preprocessing shapes, class predictions on sample images, Softmax normalization, and error handling.

### Step 2: Launch the Application
```bash
python projects/ai-image-classifier/backend/main.py
```
Open [http://localhost:8005](http://localhost:8005) in your browser.
