# Personalized Course Recommendation Engine · Wrench Wise Project Lab

A standalone, fully functional Recommender System built with **FastAPI**, **Scikit-learn**, and modern browser UI.

Learners explore content-based TF-IDF semantic vector similarity, user-user collaborative filtering matrix multiplication, hybrid weighting with tunable $\alpha$, cold-start fallback handling, and transparent explainability justifications.

---

## 1. Directory Structure

```text
projects/recommendation-engine/
├── backend/
│   ├── main.py                   # FastAPI REST API & static server (Port 8006)
│   ├── recommender_service.py    # TF-IDF, User-Item matrix, Hybrid engine
├── data/
│   ├── items.csv                 # 25 technical curriculum courses
│   └── ratings.csv               # 1,043 student interaction ratings across 100 users
├── frontend/
│   ├── index.html                # Interactive UI with profile selector, feed & telemetry
│   ├── app.js                    # Controller & live rating retrainer
│   └── style.css                 # Clean Wrench Wise design tokens
├── tests/
│   └── test_recommender.py       # Automated pytest suite (8 test cases)
└── README.md
```

---

## 2. Quickstart & Execution

### Prerequisites
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `numpy`, `pytest`

### Step 1: Run Automated Tests
```bash
pytest projects/recommendation-engine/tests/test_recommender.py -v
```
All 8 test cases verify data loading, TF-IDF content model, collaborative matrix creation, hybrid blending, cold-start fallback, live rating updates, and input error handling.

### Step 2: Launch the Application
```bash
python projects/recommendation-engine/backend/main.py
```
Open [http://localhost:8006](http://localhost:8006) in your browser.
