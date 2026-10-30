"""
Model Service for ML Model Builder.
Handles data loading, preprocessing, scikit-learn training, evaluation, and inference.
"""
import os
import time
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "housing.csv")

class MLModelService:
    def __init__(self, data_path: str = DATA_PATH):
        self.data_path = os.path.abspath(data_path)
        self.df: Optional[pd.DataFrame] = None
        self.trained_model: Optional[Any] = None
        self.scaler: Optional[Any] = None
        self.selected_features: List[str] = []
        self.target_column: str = "MedHouseVal"
        self.scaling_method: str = "standard"
        self.model_info: Dict[str, Any] = {}
        self.load_data()

    def load_data(self) -> pd.DataFrame:
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Dataset not found at {self.data_path}")
        self.df = pd.read_csv(self.data_path)
        return self.df

    def get_dataset_info(self) -> Dict[str, Any]:
        if self.df is None:
            self.load_data()
        
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns.tolist()
        corr_matrix = self.df[numeric_cols].corr().round(3).to_dict()

        summary = {}
        for col in numeric_cols:
            summary[col] = {
                "mean": round(float(self.df[col].mean()), 3),
                "std": round(float(self.df[col].std()), 3),
                "min": round(float(self.df[col].min()), 3),
                "max": round(float(self.df[col].max()), 3),
                "median": round(float(self.df[col].median()), 3),
                "missing": int(self.df[col].isna().sum())
            }

        return {
            "total_rows": int(len(self.df)),
            "columns": list(self.df.columns),
            "target_candidate": "MedHouseVal",
            "feature_candidates": [c for c in numeric_cols if c != "MedHouseVal"],
            "summary": summary,
            "correlations": corr_matrix,
            "sample_rows": self.df.head(5).to_dict(orient="records")
        }

    def train(
        self,
        features: List[str],
        target: str = "MedHouseVal",
        algorithm: str = "linear_regression",
        hyperparameters: Optional[Dict[str, Any]] = None,
        test_size: float = 0.2,
        random_state: int = 42,
        scaling: str = "standard"
    ) -> Dict[str, Any]:
        if self.df is None:
            self.load_data()

        hyperparameters = hyperparameters or {}

        # Validate inputs
        if not features:
            raise ValueError("At least one feature must be selected.")
        for f in features:
            if f not in self.df.columns:
                raise ValueError(f"Feature '{f}' not found in dataset.")
        if target not in self.df.columns:
            raise ValueError(f"Target '{target}' not found in dataset.")

        if not (0.05 <= test_size <= 0.5):
            raise ValueError("Test size must be between 0.05 and 0.50.")

        X = self.df[features].copy()
        y = self.df[target].copy()

        # Handle missing values if any
        X = X.fillna(X.mean())
        y = y.fillna(y.mean())

        # Train/Test Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

        # Scaling
        self.scaling_method = scaling
        if scaling == "standard":
            self.scaler = StandardScaler()
            X_train_proc = self.scaler.fit_transform(X_train)
            X_test_proc = self.scaler.transform(X_test)
        elif scaling == "minmax":
            self.scaler = MinMaxScaler()
            X_train_proc = self.scaler.fit_transform(X_train)
            X_test_proc = self.scaler.transform(X_test)
        else:
            self.scaler = None
            X_train_proc = X_train.values
            X_test_proc = X_test.values

        # Select & Instantiate Model
        algo_key = algorithm.lower()
        if algo_key in ("linear_regression", "ols"):
            model = LinearRegression()
        elif algo_key == "ridge":
            alpha = float(hyperparameters.get("alpha", 1.0))
            model = Ridge(alpha=alpha)
        elif algo_key == "lasso":
            alpha = float(hyperparameters.get("alpha", 0.01))
            model = Lasso(alpha=alpha, max_iter=2000)
        elif algo_key in ("decision_tree", "decisiontreeregressor"):
            max_depth = hyperparameters.get("max_depth")
            max_depth = int(max_depth) if max_depth and int(max_depth) > 0 else None
            min_samples_split = int(hyperparameters.get("min_samples_split", 2))
            model = DecisionTreeRegressor(max_depth=max_depth, min_samples_split=min_samples_split, random_state=random_state)
        elif algo_key in ("random_forest", "randomforestregressor"):
            n_estimators = int(hyperparameters.get("n_estimators", 50))
            max_depth = hyperparameters.get("max_depth")
            max_depth = int(max_depth) if max_depth and int(max_depth) > 0 else 10
            model = RandomForestRegressor(n_estimators=n_estimators, max_depth=max_depth, random_state=random_state, n_jobs=1)
        else:
            raise ValueError(f"Unsupported algorithm '{algorithm}'. Choose from: linear_regression, ridge, lasso, decision_tree, random_forest")

        # Train & measure time
        t0 = time.time()
        model.fit(X_train_proc, y_train)
        training_time_ms = round((time.time() - t0) * 1000, 2)

        # Predictions on Train & Test
        y_train_pred = model.predict(X_train_proc)
        y_test_pred = model.predict(X_test_proc)

        # Evaluation Metrics
        mae = float(mean_absolute_error(y_test, y_test_pred))
        mse = float(mean_squared_error(y_test, y_test_pred))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_test, y_test_pred))
        train_r2 = float(r2_score(y_train, y_train_pred))

        # Model Parameters Inspection
        inspection: Dict[str, Any] = {
            "algorithm": algo_key,
            "features_used": features,
            "target": target,
            "n_train_samples": len(X_train),
            "n_test_samples": len(X_test),
        }

        if hasattr(model, "coef_"):
            coeffs = {feat: round(float(c), 4) for feat, c in zip(features, model.coef_)}
            inspection["coefficients"] = coeffs
            inspection["intercept"] = round(float(model.intercept_), 4)
            terms = [f"({c:+.3f} * {f})" for f, c in coeffs.items()]
            inspection["formula"] = f"y = {model.intercept_:.3f} + " + " + ".join(terms)

        if hasattr(model, "feature_importances_"):
            importances = {feat: round(float(imp), 4) for feat, imp in zip(features, model.feature_importances_)}
            inspection["feature_importances"] = importances

        if hasattr(model, "get_depth"):
            inspection["tree_depth"] = int(model.get_depth())
            inspection["n_leaves"] = int(model.get_n_leaves())

        # Subsample points for scatter plot (max 120 points for fast, clean rendering)
        indices = np.linspace(0, len(y_test) - 1, min(120, len(y_test)), dtype=int)
        y_test_arr = np.array(y_test)
        actual_vs_pred = [
            {
                "actual": round(float(y_test_arr[i]), 3),
                "predicted": round(float(y_test_pred[i]), 3),
                "residual": round(float(y_test_arr[i] - y_test_pred[i]), 3)
            }
            for i in indices
        ]

        # Save active model for inference
        self.trained_model = model
        self.selected_features = features
        self.target_column = target
        self.model_info = inspection

        return {
            "status": "success",
            "algorithm": algo_key,
            "metrics": {
                "mae": round(mae, 4),
                "mse": round(mse, 4),
                "rmse": round(rmse, 4),
                "r2_score": round(r2, 4),
                "train_r2_score": round(train_r2, 4),
                "training_time_ms": training_time_ms
            },
            "inspection": inspection,
            "actual_vs_predicted": actual_vs_pred,
            "evaluation_interpretation": self._interpret_metrics(r2, mae)
        }

    def predict(self, feature_values: Dict[str, float]) -> Dict[str, Any]:
        if self.trained_model is None:
            raise RuntimeError("No model has been trained yet. Train a model first.")

        # Build feature DataFrame with exact training columns
        row_dict = {}
        for feat in self.selected_features:
            if feat not in feature_values:
                row_dict[feat] = float(self.df[feat].mean())
            else:
                row_dict[feat] = float(feature_values[feat])

        X_input_df = pd.DataFrame([row_dict])[self.selected_features]

        if self.scaler is not None:
            X_input_proc = self.scaler.transform(X_input_df)
        else:
            X_input_proc = X_input_df.values

        prediction = float(self.trained_model.predict(X_input_proc)[0])

        return {
            "prediction": round(prediction, 4),
            "target": self.target_column,
            "unit": "$100,000s (California Housing benchmark)",
            "estimated_value_dollars": f"${round(prediction * 100000, 2):,}",
            "features_used": {feat: row_dict[feat] for feat in self.selected_features}
        }

    def _interpret_metrics(self, r2: float, mae: float) -> str:
        if r2 >= 0.70:
            quality = "Strong explanatory power"
        elif r2 >= 0.50:
            quality = "Moderate fit"
        elif r2 >= 0.20:
            quality = "Weak predictive signal; consider feature engineering or non-linear models"
        else:
            quality = "Poor fit; model is barely outperforming the baseline mean"

        return f"{quality}. On average, the model's prediction deviates from actual house value by ~${round(mae * 100000):,} (MAE: {round(mae, 3)})."
