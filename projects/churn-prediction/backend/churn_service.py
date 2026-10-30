"""
Churn Prediction ML Service.
Handles preprocessing, Scikit-learn classification model training, evaluation, and risk scoring.
"""
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import time
import pandas as pd
import numpy as np

from typing import Dict, Any, List, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import (
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "churn_data.csv")

class ChurnService:
    def __init__(self, data_path: str = DATA_PATH):
        self.data_path = os.path.abspath(data_path)
        self.df: Optional[pd.DataFrame] = None
        self.trained_model: Optional[Any] = None
        self.scaler: Optional[StandardScaler] = None
        self.feature_names: List[str] = []
        self.selected_raw_features: List[str] = []
        self.numeric_features = ["tenure", "monthly_charges", "total_charges"]
        self.categorical_features = [
            "contract_type", "internet_service", "tech_support",
            "online_security", "paperless_billing", "payment_method"
        ]
        self.model_metadata: Dict[str, Any] = {}
        self.load_data()

    def load_data(self) -> pd.DataFrame:
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Churn dataset not found at {self.data_path}")
        self.df = pd.read_csv(self.data_path)
        return self.df

    def get_dataset_info(self) -> Dict[str, Any]:
        if self.df is None:
            self.load_data()

        total = len(self.df)
        churn_count = int(self.df["churn"].sum())
        retained_count = total - churn_count

        return {
            "total_records": total,
            "churn_count": churn_count,
            "retained_count": retained_count,
            "churn_rate": round((churn_count / total) * 100, 2),
            "available_features": {
                "numeric": self.numeric_features,
                "categorical": self.categorical_features
            },
            "sample_records": self.df.head(5).to_dict(orient="records")
        }

    def train(
        self,
        features: Optional[List[str]] = None,
        algorithm: str = "random_forest",
        hyperparameters: Optional[Dict[str, Any]] = None,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict[str, Any]:
        if self.df is None:
            self.load_data()

        hyperparameters = hyperparameters or {}
        
        all_feature_candidates = self.numeric_features + self.categorical_features
        if features is not None and len(features) == 0:
            raise ValueError("At least one feature must be selected.")
        selected_features = features if features is not None else all_feature_candidates

        # Validate
        for f in selected_features:
            if f not in all_feature_candidates:
                raise ValueError(f"Unknown feature '{f}'")


        self.selected_raw_features = selected_features

        # Preprocessing: Split into numeric and categorical
        chosen_num = [f for f in selected_features if f in self.numeric_features]
        chosen_cat = [f for f in selected_features if f in self.categorical_features]

        # One-hot encode categoricals
        X_df = self.df[chosen_num].copy() if chosen_num else pd.DataFrame(index=self.df.index)
        
        if chosen_cat:
            cat_dummies = pd.get_dummies(self.df[chosen_cat], drop_first=True, dtype=float)
            X_df = pd.concat([X_df, cat_dummies], axis=1)

        y = self.df["churn"].values

        # Store encoded feature names
        self.feature_names = list(X_df.columns)

        # Train / Test split with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X_df, y, test_size=test_size, random_state=random_state, stratify=y
        )

        # Scale numericals if present
        if chosen_num:
            self.scaler = StandardScaler()
            X_train[chosen_num] = self.scaler.fit_transform(X_train[chosen_num])
            X_test[chosen_num] = self.scaler.transform(X_test[chosen_num])
        else:
            self.scaler = None

        # Instantiate algorithm
        algo_key = algorithm.lower()
        if algo_key in ("logistic_regression", "logit"):
            c_val = float(hyperparameters.get("C", 1.0))
            model = LogisticRegression(C=c_val, max_iter=1000, random_state=random_state)
        elif algo_key in ("random_forest", "rf"):
            n_est = int(hyperparameters.get("n_estimators", 50))
            max_depth = hyperparameters.get("max_depth")
            max_depth = int(max_depth) if max_depth and int(max_depth) > 0 else 8
            model = RandomForestClassifier(n_estimators=n_est, max_depth=max_depth, random_state=random_state)
        elif algo_key in ("decision_tree", "dt"):
            max_depth = hyperparameters.get("max_depth")
            max_depth = int(max_depth) if max_depth and int(max_depth) > 0 else 5
            model = DecisionTreeClassifier(max_depth=max_depth, random_state=random_state)
        elif algo_key in ("gradient_boosting", "gb"):
            n_est = int(hyperparameters.get("n_estimators", 50))
            lr = float(hyperparameters.get("learning_rate", 0.1))
            model = GradientBoostingClassifier(n_estimators=n_est, learning_rate=lr, random_state=random_state)
        else:
            raise ValueError(f"Unsupported algorithm '{algorithm}'. Choose from: logistic_regression, random_forest, decision_tree, gradient_boosting")

        # Fit model
        t0 = time.time()
        model.fit(X_train, y_train)
        training_time_ms = round((time.time() - t0) * 1000, 2)

        # Predictions & Probabilities
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else y_pred

        # Metrics
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        auc = float(roc_auc_score(y_test, y_prob))

        # Feature Importance / Coefficients
        importance_dict = {}
        if hasattr(model, "feature_importances_"):
            for fname, imp in zip(self.feature_names, model.feature_importances_):
                importance_dict[fname] = round(float(imp), 4)
        elif hasattr(model, "coef_"):
            for fname, c in zip(self.feature_names, model.coef_[0]):
                importance_dict[fname] = round(float(c), 4)

        # Sort by magnitude
        sorted_importance = dict(sorted(importance_dict.items(), key=lambda item: abs(item[1]), reverse=True)[:10])

        self.trained_model = model
        self.model_metadata = {
            "algorithm": algo_key,
            "features": self.selected_raw_features,
            "encoded_features": self.feature_names,
            "metrics": {
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "roc_auc": round(auc, 4),
                "training_time_ms": training_time_ms
            }
        }

        return {
            "status": "success",
            "algorithm": algo_key,
            "metrics": self.model_metadata["metrics"],
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp),
                "total_test_samples": int(len(y_test))
            },
            "top_feature_importance": sorted_importance,
            "performance_interpretation": self._interpret_performance(acc, prec, rec, f1)
        }

    def predict_churn_risk(self, customer_profile: Dict[str, Any]) -> Dict[str, Any]:
        if self.trained_model is None:
            raise RuntimeError("No classification model trained yet. Train a model first.")

        # Build raw DataFrame
        df_input = pd.DataFrame([customer_profile])

        # Preprocess matching training feature pipeline
        chosen_num = [f for f in self.selected_raw_features if f in self.numeric_features]
        chosen_cat = [f for f in self.selected_raw_features if f in self.categorical_features]

        X_input = pd.DataFrame(index=[0])
        for col in chosen_num:
            val = float(customer_profile.get(col, self.df[col].mean()))
            X_input[col] = [val]

        if self.scaler is not None and chosen_num:
            X_input[chosen_num] = self.scaler.transform(X_input[chosen_num])

        # One hot encode categoricals matching training dummy columns
        for col in self.feature_names:
            if col not in chosen_num:
                # e.g. contract_type_Two year
                X_input[col] = 0.0

        for cat in chosen_cat:
            val = str(customer_profile.get(cat, ""))
            col_name = f"{cat}_{val}"
            if col_name in X_input.columns:
                X_input[col_name] = 1.0

        # Predict probability
        prob = float(self.trained_model.predict_proba(X_input[self.feature_names])[0][1])
        predicted_class = int(prob >= 0.5)

        # Risk tier & retention recommendations
        if prob >= 0.65:
            risk_tier = "HIGH"
            rec = "Urgent retention intervention: Offer loyalty contract discount or free tech support upgrade."
        elif prob >= 0.35:
            risk_tier = "MODERATE"
            rec = "Customer satisfaction survey & proactive check-in recommended."
        else:
            risk_tier = "LOW"
            rec = "Healthy customer relationship; standard engagement."

        return {
            "churn_probability": round(prob, 4),
            "churn_percentage": f"{round(prob * 100, 1)}%",
            "predicted_class": "CHURN_RISK" if predicted_class == 1 else "RETAINED",
            "risk_tier": risk_tier,
            "recommended_action": rec,
            "customer_profile_analyzed": customer_profile
        }

    def _interpret_performance(self, acc: float, prec: float, rec: float, f1: float) -> str:
        return (
            f"Model achieves {round(acc * 100, 1)}% accuracy with an F1-Score of {round(f1, 3)}. "
            f"Recall of {round(rec * 100, 1)}% indicates the proportion of actual churners successfully identified."
        )
