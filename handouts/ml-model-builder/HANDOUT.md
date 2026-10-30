# Wrench Wise Project Lab · Technical Handout
## Project 01: Machine Learning Model Builder

---

## 1. Project Objective & Industry Context

### 1.1 Objective
Design, construct, and evaluate an interactive end-to-end Machine Learning regression system that allows data scientists and machine learning engineers to:
1. Ingest and statistically analyze multivariate real-world tabular data.
2. Select feature subsets and apply standard scaling transformations ($\mu = 0, \sigma = 1$).
3. Train and tune multiple regression families (Ordinary Least Squares, $L_2$ Ridge, $L_1$ Lasso, Decision Trees, and Random Forests).
4. Inspect model weights ($\beta_i$), bias terms ($\beta_0$), and Gini impurity feature importances.
5. Compute rigorous regression metrics: Mean Absolute Error (MAE), Mean Squared Error (MSE), Root Mean Squared Error (RMSE), and the Coefficient of Determination ($R^2$).
6. Plot actual versus predicted residual distributions and execute real-time inference predictions.

### 1.2 Industry Problem
In enterprise machine learning deployments (e.g., automated property appraisal, dynamic logistics pricing, demand forecasting), deploying an unchecked model leads to severe financial and operational risk. Data scientists must systematically understand:
- **Multicollinearity**: When features (like `AveRooms` and `AveBedrms`) are highly correlated, ordinary least squares estimates become unstable with high variance.
- **Overfitting vs. Underfitting**: Balancing model complexity (tree depth or regularization penalty $\lambda$) against generalization on unseen test splits.
- **Interpretability**: Explaining why a property valuation model produced a specific dollar estimate.

---

## 2. System Architecture

```text
+--------------------------------------------------------------------------+
|                         STUDENT INTERACTIVE CLIENT                       |
|  - Feature Checkboxes [MedInc, HouseAge, ...]                            |
|  - Algorithm Selector (OLS, Ridge, Lasso, Decision Tree, Random Forest)   |
|  - Test Split & Scaling Controls (StandardScaler / MinMaxScaler)         |
|  - Scatter Plot: Actual vs Predicted Points                              |
|  - Interactive Inference Simulator (Live Dollar Appraisal)               |
+------------------------------------+-------------------------------------+
                                     |
                                     | HTTP REST (JSON)
                                     v
+--------------------------------------------------------------------------+
|                        FASTAPI APPLICATION SERVER                        |
|                                                                          |
|  [GET /api/dataset]                                                      |
|   - Reads California Housing CSV (2,500 samples)                         |
|   - Generates Pearson Correlation Matrix & Summary Statistics            |
|                                                                          |
|  [POST /api/train]                                                       |
|   - Validates feature dimensions & bounds                                |
|   - Splits train/test (sklearn.model_selection.train_test_split)         |
|   - Applies StandardScaler (sklearn.preprocessing)                       |
|   - Fits model (LinearRegression / Ridge / DecisionTree / RandomForest)   |
|   - Computes MAE, MSE, RMSE, R2 Score                                    |
|   - Extracts Beta coefficients or Tree Importances                       |
|   - Returns 120 subsampled actual vs predicted coordinate pairs          |
|                                                                          |
|  [POST /api/predict]                                                     |
|   - Transforms input vector via learned scaler                           |
|   - Calls model.predict() -> Formatted dollar appraisal                  |
+--------------------------------------------------------------------------+
```

---

## 3. Mathematical & Algorithmic Foundations

### 3.1 Ordinary Least Squares (OLS) Regression
Linear regression assumes the target $y$ is a linear combination of input features $X$ plus Gaussian noise $\epsilon \sim \mathcal{N}(0, \sigma^2)$:

$$\hat{y} = \beta_0 + \sum_{j=1}^{p} \beta_j X_j$$

The objective function minimizes the Residual Sum of Squares (RSS):

$$\mathcal{L}_{\text{OLS}}(\beta) = \sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)^2 = \|y - X\beta\|_2^2$$

The closed-form analytical solution (Normal Equation) is:

$$\beta = (X^T X)^{-1} X^T y$$

### 3.2 Ridge Regularization ($L_2$ Penalty)
When features are collinear, $X^T X$ approaches singularity. Ridge regression adds a quadratic shrinkage penalty:

$$\mathcal{L}_{\text{Ridge}}(\beta) = \|y - X\beta\|_2^2 + \alpha \|\beta\|_2^2 = \sum_{i=1}^{n} (y_i - \hat{y}_i)^2 + \alpha \sum_{j=1}^{p} \beta_j^2$$

Analytical solution:

$$\beta_{\text{Ridge}} = (X^T X + \alpha I)^{-1} X^T y$$

As $\alpha \to \infty$, all $\beta_j \to 0$ (bias increases, variance decreases).

### 3.3 Evaluation Metrics

1. **Mean Absolute Error (MAE)**:
   $$\text{MAE} = \frac{1}{n}\sum_{i=1}^{n} |y_i - \hat{y}_i|$$
   Directly interpretable in target units ($100k or dollars). Robust to extreme outliers.

2. **Mean Squared Error (MSE)** & **Root Mean Squared Error (RMSE)**:
   $$\text{MSE} = \frac{1}{n}\sum_{i=1}^{n} (y_i - \hat{y}_i)^2, \quad \text{RMSE} = \sqrt{\text{MSE}}$$
   Penalizes large errors quadratically. Critical in housing appraisal where a $200,000 error is disproportionately worse than two $100,000 errors.

3. **Coefficient of Determination ($R^2$)**:
   $$R^2 = 1 - \frac{\sum_{i=1}^n (y_i - \hat{y}_i)^2}{\sum_{i=1}^n (y_i - \bar{y})^2}$$
   Measures the proportion of variance in $y$ explained by the features. An $R^2 = 1.0$ indicates perfect prediction; $R^2 = 0.0$ indicates performance equal to simply predicting the mean $\bar{y}$.

---

## 4. Code Implementation Walkthrough

### 4.1 Data Pipeline & Preprocessing (`model_service.py`)
```python
# Feature scaling avoids features with large absolute ranges (e.g. Population: 3000)
# dominating features with small ranges (e.g. AveRooms: 5)
if scaling == "standard":
    self.scaler = StandardScaler()
    X_train_proc = self.scaler.fit_transform(X_train)
    X_test_proc = self.scaler.transform(X_test)
```
> [!IMPORTANT]
> The scaler must be **fit only on `X_train`** and then applied (`transform`) to `X_test`. Fitting on the entire dataset causes **data leakage**, inflating test metrics artificially.

### 4.2 Model Fitting & Parameter Inspection
```python
if hasattr(model, "coef_"):
    coeffs = {feat: round(float(c), 4) for feat, c in zip(features, model.coef_)}
    inspection["coefficients"] = coeffs
    inspection["intercept"] = round(float(model.intercept_), 4)
```

---

## 5. Guided Experiments for Learners

### Experiment 1: The Dominant Feature Test
1. Select only `MedInc` (Median Income) as the sole feature.
2. Train with Linear Regression. Observe the $R^2$ score (typically $\approx 0.46$).
3. Now deselect `MedInc` and select all other 7 features (`HouseAge`, `AveRooms`, `AveBedrms`, `Population`, `AveOccup`, `Latitude`, `Longitude`).
4. Train again. Compare the $R^2$ score and notice how single-handedly predictive household income is in California property markets.

### Experiment 2: Regularization under Multicollinearity
1. Select both `AveRooms` and `AveBedrms`. Notice their strong positive correlation in the correlation matrix.
2. Train Linear Regression vs. Ridge with $\alpha = 10.0$.
3. Inspect how the coefficient weights change and stabilize.

### Experiment 3: Overfitting with Decision Trees
1. Select all features and choose `Decision Tree Regressor`.
2. Set `max_depth = 20`.
3. Check `train_r2_score` vs `r2_score` (test).
4. Notice how `train_r2` reaches $\approx 0.99$ while test $R^2$ drops below $0.55$. This is textbook overfitting.
5. Decrease `max_depth` to $6$ and observe how test $R^2$ recovers.

---

## 6. Debugging Challenge

**Symptom**: During live prediction inference, if the user leaves one input feature blank or supplies an empty string, the server throws an uncaught error.

**Fix Exercise**: Inspect `model_service.py` in method `predict()`. Notice how we default missing feature values to `float(self.df[feat].mean())`. Modify the API to return a warning in the response payload indicating which features were imputed with dataset averages.

---

## 7. Knowledge Checkpoint

1. Why is $R^2$ sometimes negative on an out-of-sample test set?
2. What happens to the coefficients of Lasso ($L_1$) regression that does not happen in Ridge ($L_2$) as $\alpha$ increases?
3. How does feature scaling affect tree-based models like Decision Trees versus gradient-based or distance-based models?
