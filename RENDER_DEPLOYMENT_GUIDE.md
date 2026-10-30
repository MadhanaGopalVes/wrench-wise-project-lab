# Complete Guide: Deploying Wrench Wise Project Lab to Render

This repository is fully containerized and pre-configured for **1-click deployment on [Render](https://render.com/)** using the included `Dockerfile` and `render.yaml`.

---

## 1. Overview of the Deployment Architecture

When deployed to Render:
- **Unified Single-Port Delivery**: Render exposes a single secure public HTTPS URL (`https://<your-service>.onrender.com`).
- **Internal Python AI Gateway**: Runs inside the container on `127.0.0.1:8080`, hosting Scikit-learn, ONNX Runtime MobileNetV2, pypdf, and function-calling agent tools.
- **Node.js Web Server**: Listens on Render's public `$PORT`, serving the frontend, SQLite database, progress tracking, certificates, and automatically reverse-proxying AI inference calls to the internal gateway.
- **Zero CORS Issues**: All client requests (image classification, churn risk scoring, recommendations, PDF queries) communicate seamlessly via relative `/api/*` endpoints.

---

## 2. Quick Deployment (Two Options)

### Option A: 1-Click Deployment via Render Blueprint (Recommended)

1. **Push your code to GitHub**:
   If not already in a Git repository:
   ```bash
   git init
   git add .
   git commit -m "Complete Wrench Wise Project Lab with Docker & Render config"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Go to Render**:
   - Open [Render Dashboard](https://dashboard.render.com/).
   - Click the **New +** button in the top right.
   - Select **Blueprint**.
   - Select your GitHub repository.
   - Render will automatically read `render.yaml`, set up the Docker service, generate the `CERT_SECRET`, and configure the health check.
   - Click **Apply**.

---

### Option B: Manual Web Service Setup on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub/GitLab repository.
4. Fill in the service details:
   - **Name**: `wrench-wise-project-lab` (or your choice)
   - **Region**: Closest to your users (e.g., *Singapore*, *Frankfurt*, *Oregon*)
   - **Branch**: `main`
   - **Runtime**: **Docker** (Render will automatically detect the root `Dockerfile`)
   - **Instance Type**: **Free** (or Starter for higher memory)
5. **Environment Variables** (Under *Advanced* or *Environment*):
   - `PORT`: `10000` (Default on Render)
   - `CERT_SECRET`: Click *Generate* (or enter a random 32-character string)
   - `OPENBLAS_NUM_THREADS`: `1`
   - `OMP_NUM_THREADS`: `1`
6. **Health Check Path**:
   - Set to `/api/system/status`
7. Click **Create Web Service**.

---

## 3. What Happens During Build & Deployment

Render executes:
1. Docker builds the Debian-slim container with Node.js 22 and Python 3.12.
2. `pip3` installs `fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `pypdf`, `pillow`, and `onnxruntime`.
3. `start.sh` boots the Python gateway on port 8080 and Node.js on Render's `$PORT`.
4. Render probes `/api/system/status`. Once `ALL_SYSTEMS_OPERATIONAL` returns `200 OK`, your service goes **Live**.

---

## 4. Post-Deployment Verification Checklist

Once Render provides your live URL (e.g. `https://wrench-wise-project-lab.onrender.com`):

| Component | URL Path | Verification |
| :--- | :--- | :--- |
| **Project Lab Portal** | `/` | All 6 projects show `● LIVE LAB` badge with unlocked access |
| **Executive Management Portal** | `/portal` | Interactive management tabs and live preview iframes |
| **System Status Health Check** | `/api/system/status` | JSON showing `ALL_SYSTEMS_OPERATIONAL` & 46 passed tests |
| **Customer Churn Lab** | `/project/churn-prediction` | Live model training & customer risk scoring |
| **AI Image Classifier Lab** | `/project/image-classifier` | ImageNet Top-5 probability classification |
| **Recommendation Engine Lab**| `/project/recommendation-engine`| TF-IDF + Collaborative filtering & alpha slider |
| **Certificate Verification** | `/verify` | Validates HMAC-signed certificate IDs |
