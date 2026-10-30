# Machine Learning Model Builder · Wrench Wise Project Lab

A standalone, fully functional Machine Learning application built with **FastAPI**, **Scikit-learn**, **Pandas**, and **NumPy**.

Students interactively configure feature subsets, train real regression models (Linear Regression, Ridge, Lasso, Decision Tree, Random Forest) on the California Housing dataset (2,500 real records), inspect regression coefficients/feature importances, evaluate with MAE, MSE, RMSE, and $R^2$, visualize actual versus predicted values on a scatterplot, and perform live prediction inference.

---

## 1. Directory Structure

```text
projects/ml-model-builder/
├── backend/
│   ├── main.py              # FastAPI REST API & static server
│   ├── model_service.py     # Data processing, scikit-learn models & inference
│   └── requirements.txt     # Python dependencies
├── data/
│   └── housing.csv          # California Housing benchmark dataset (2,500 samples)
├── frontend/
│   ├── index.html           # Interactive UI (feature selector, metrics, charts)
│   ├── app.js               # Frontend controller & canvas scatterplot
│   └── style.css            # Wrench Wise design tokens
├── tests/
│   └── test_ml_backend.py   # Pytest test suite (8 test cases)
└── README.md
```

---

## 2. Quickstart & Execution

### Prerequisites
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `numpy`, `pytest`

### Step 1: Install Dependencies
```bash
cd projects/ml-model-builder
pip install -r backend/requirements.txt
```

### Step 2: Run Automated Tests
```bash
pytest tests/test_ml_backend.py -v
```
All 8 test cases verify dataset ingestion, linear regression, regularization penalties, decision trees, validation guards, and prediction inference.

### Step 3: Launch the Application
```bash
python backend/main.py
```
Open [http://localhost:8001](http://localhost:8001) in your browser.

---

## 3. API Endpoints

- `GET /health`: Healthcheck verifying dataset rows loaded.
- `GET /api/dataset`: Returns total row count, column statistical summaries (mean, std, min, max, median, missing count), and feature correlation matrix.
- `POST /api/train`:
  - Request body:
    ```json
    {
      "features": ["MedInc", "HouseAge", "AveRooms"],
      "target": "MedHouseVal",
      "algorithm": "linear_regression",
      "hyperparameters": { "alpha": 1.0, "max_depth": 6 },
      "test_size": 0.20,
      "random_state": 42,
      "scaling": "standard"
    }
    ```
  - Response: Evaluated MAE, MSE, RMSE, $R^2$, learned parameters (weights/importances), and actual vs. predicted test scatter points.
- `POST /api/predict`:
  - Request body:
    ```json
    {
      "feature_values": { "MedInc": 4.5, "HouseAge": 28.0, "AveRooms": 5.4 }
    }
    ```
  - Response: Exact predicted house valuation in dollars and $100k benchmark units.
