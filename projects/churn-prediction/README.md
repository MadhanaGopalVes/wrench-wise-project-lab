# Customer Churn Prediction & Retention Analytics · Wrench Wise Project Lab

A standalone, fully functional Machine Learning classification and risk-scoring application built with **FastAPI**, **Scikit-learn**, and modern browser UI.

Learners explore a realistic 2,500-sample telecom dataset, configure numeric and categorical feature sets, train multiple classification algorithms (Random Forest, Gradient Boosting, Logistic Regression, Decision Tree), inspect interactive Confusion Matrices and Feature Importances, and simulate live customer profiles to generate churn risk tiers and recommended retention playbooks.

---

## 1. Directory Structure

```text
projects/churn-prediction/
├── backend/
│   ├── main.py                   # FastAPI REST API & static server
│   ├── churn_service.py          # Preprocessing, ML training, evaluation & risk scoring
├── data/
│   └── churn_data.csv            # 2,500 realistic telecom customer records
├── frontend/
│   ├── index.html                # Interactive UI with confusion matrix & risk simulator
│   ├── app.js                    # Controller & live prediction renderer
│   └── style.css                 # Clean Wrench Wise design tokens
├── tests/
│   └── test_churn.py             # Automated pytest suite (8 test cases)
└── README.md
```

---

## 2. Quickstart & Execution

### Prerequisites
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `numpy`, `pytest`

### Step 1: Run Automated Tests
```bash
pytest projects/churn-prediction/tests/test_churn.py -v
```
All 8 test cases verify data loading, Random Forest, Logistic Regression, Decision Tree, Gradient Boosting, error handling, and live risk profile inference.

### Step 2: Launch the Application
```bash
python projects/churn-prediction/backend/main.py
```
Open [http://localhost:8004](http://localhost:8004) in your browser.
