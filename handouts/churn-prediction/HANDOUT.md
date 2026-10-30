# Wrench Wise Project Lab · Technical Handout
## Project 04: Customer Churn Prediction & Retention Analytics

---

## 1. Project Objective & Industry Context

### 1.1 Objective
Design, construct, and evaluate an interactive, production-grade Customer Churn Prediction system that allows machine learning engineers and business analysts to:
1. Ingest, preprocess, and analyze multivariate telecom customer subscription data.
2. Handle class imbalance (28.6% churn rate) and feature type divergence (numeric vs. one-hot encoded categorical variables).
3. Train, compare, and hyperparameter-tune classification algorithms:
   - **Logistic Regression**: Linear decision boundary with Sigmoid link function and $L_2$ regularization penalty.
   - **Decision Trees**: Non-linear recursive binary splitting using Gini Impurity criterion.
   - **Random Forest**: Ensemble bagging with bootstrap aggregation and randomized feature subsets.
   - **Gradient Boosting**: Sequential ensemble boosting optimizing pseudo-residuals.
4. Calculate and visualize comprehensive binary classification metrics: Accuracy, Precision (Positive Predictive Value), Recall (Sensitivity), F1 Score, and ROC-AUC.
5. Inspect and interpret a real 2x2 **Confusion Matrix** with actionable domain analysis on the business cost of False Negatives (lost customers) vs. False Positives (unnecessary promo spending).
6. Execute live customer risk scoring profiles and recommend targeted retention playbooks based on calculated churn probabilities.

### 1.2 Industry Problem
Customer acquisition cost (CAC) in SaaS, subscription telecoms, and EdTech typically exceeds customer retention cost by 5x to 7x. Deploying an unvalidated classification model introduces severe financial waste:
- **High False Negatives ($FN$)**: High-value customers churn without receiving proactive retention outreach, directly eroding Annual Recurring Revenue (ARR).
- **High False Positives ($FP$)**: Satisfied, loyal customers receive unneeded discounts, unnecessarily eroding gross margins.
- **Explainability Deficit**: Account executives and customer success managers cannot intervene effectively without understanding *why* a customer is flagged at risk (e.g., month-to-month contract + fiber optic without tech support).

---

## 2. System Architecture

```text
+--------------------------------------------------------------------------+
|                         STUDENT INTERACTIVE CLIENT                       |
|  - Feature Toggles (tenure, monthly_charges, contract_type, ...)         |
|  - Classification Model Selector (Random Forest, Logistic, Boosting)     |
|  - Hyperparameter Sliders (n_estimators, max_depth, C, learning_rate)    |
|  - Confusion Matrix Diagnostic Grid (TN, FP, FN, TP)                     |
|  - Feature Importance Contribution Barchart                              |
|  - Customer Risk Scoring Playground & Playbook Recommender               |
+------------------------------------+-------------------------------------+
                                     |
                                     | HTTP REST (JSON)
                                     v
+--------------------------------------------------------------------------+
|                        FASTAPI APPLICATION SERVER                        |
|                                                                          |
|  [GET /api/dataset]                                                      |
|   - Reads churn_data.csv (2,500 customer records)                        |
|   - Calculates total records, churn rate %, and sample table             |
|                                                                          |
|  [POST /api/train]                                                       |
|   - One-hot encodes categorical fields (pd.get_dummies)                  |
|   - Scales numeric predictors (StandardScaler)                           |
|   - Splits train/test (sklearn.model_selection.train_test_split)         |
|   - Fits classifier (LogisticRegression / RandomForest / GradientBoost)  |
|   - Computes confusion_matrix, accuracy, precision, recall, f1, roc_auc  |
|   - Extracts Gini feature importances or standardized odds ratios        |
|                                                                          |
|  [POST /api/predict]                                                     |
|   - Preprocesses individual customer profile                             |
|   - Evaluates predict_proba() -> Churn probability %                     |
|   - Assigns Risk Tier: HIGH (>0.50), MODERATE (0.30-0.50), LOW (<0.30)   |
|   - Emits specific retention strategy recommendation                     |
+--------------------------------------------------------------------------+
```

---

## 3. Mathematical Foundations

### 3.1 Classification Metrics Formulation

$$\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}$$

$$\text{Precision} = \frac{TP}{TP + FP} \quad \text{(Quality of positive churn alerts)}$$

$$\text{Recall (Sensitivity)} = \frac{TP}{TP + FN} \quad \text{(Coverage of actual churners)}$$

$$F_1 = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$

$$\text{ROC-AUC} = \int_{0}^{1} \text{TPR}(\text{FPR}) \, d\text{FPR}$$

Where:
- $TP$ (True Positive): Actual churner correctly predicted to churn.
- $TN$ (True Negative): Retained customer correctly predicted to stay.
- $FP$ (False Positive / Type I Error): Retained customer incorrectly flagged as churner.
- $FN$ (False Negative / Type II Error): Actual churner missed by model (costliest error).

---

## 4. Practical Step-by-Step Lab Milestones

### Milestone 1: Data Exploration & Feature Inspection
- Start the Customer Churn Prediction server (`python projects/churn-prediction/backend/main.py`).
- Inspect the dataset statistics: Observe the 28.6% churn rate.
- Compare Month-to-month contracts vs. Two-year contracts in the sample data.

### Milestone 2: Train Baseline Logistic Regression
- Select `Logistic Regression`. Set $C = 1.0$.
- Train the model and inspect the Confusion Matrix.
- Notice the baseline accuracy (~78%) and examine whether precision or recall is higher.

### Milestone 3: Ensemble Random Forest Optimization
- Switch algorithm to `Random Forest Classifier`.
- Set `n_estimators = 50` and `max_depth = 6`.
- Compare the ROC-AUC score against the linear model. Notice how non-linear interactions between `tenure` and `contract_type` boost ROC-AUC above 0.80.

### Milestone 4: Feature Importance Diagnostics
- Review the Top Feature Importance chart.
- Identify the top 3 drivers of churn (e.g. `contract_type_Month-to-month`, `tenure`, `monthly_charges`).

### Milestone 5: Real-time Customer Risk Scoring & Playbook Execution
- Use the Persona buttons to test the "High Risk New Customer" (Tenure: 2 months, Fiber Optic, Month-to-month).
- Verify the model assigns **HIGH RISK** with churn probability $> 75\%$.
- Test the "Loyal Enterprise Customer" (Tenure: 60 months, Two-year contract, Auto-pay).
- Verify the model assigns **LOW RISK** with churn probability $< 15\%$.

---

## 5. Verification & Pytest Suite

Run the automated test suite locally to verify the end-to-end pipeline:

```bash
pytest projects/churn-prediction/tests/test_churn.py -v
```

All 8 tests validate:
- Dataset integrity and 2,500 sample counts.
- Random Forest, Logistic Regression, Decision Tree, and Gradient Boosting training.
- Confusion matrix dimensions and metric constraints ($Accuracy > 0.70$).
- Empty feature error validation and invalid algorithm exceptions.
- Accurate customer risk tier scoring and probability ranking.
