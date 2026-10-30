"""
Unit & Integration Tests for ML Model Builder.
Run with: pytest projects/ml-model-builder/tests/test_ml_backend.py -v
"""
import pytest
import os
import sys

# Ensure backend package is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from model_service import MLModelService

@pytest.fixture(scope="module")
def ml_service():
    return MLModelService()

def test_dataset_loads_correctly(ml_service):
    info = ml_service.get_dataset_info()
    assert info["total_rows"] == 2500
    assert "MedHouseVal" in info["columns"]
    assert len(info["feature_candidates"]) == 8
    assert "MedInc" in info["feature_candidates"]

def test_train_linear_regression(ml_service):
    res = ml_service.train(
        features=["MedInc", "HouseAge", "AveRooms"],
        target="MedHouseVal",
        algorithm="linear_regression",
        test_size=0.2,
        random_state=42
    )
    assert res["status"] == "success"
    assert "metrics" in res
    assert res["metrics"]["r2_score"] > 0.40  # MedInc has solid correlation with MedHouseVal
    assert res["metrics"]["mae"] > 0
    assert "coefficients" in res["inspection"]
    assert "MedInc" in res["inspection"]["coefficients"]
    assert len(res["actual_vs_predicted"]) > 0

def test_train_ridge_regularization(ml_service):
    res = ml_service.train(
        features=["MedInc", "HouseAge", "AveRooms", "Population"],
        algorithm="ridge",
        hyperparameters={"alpha": 2.5}
    )
    assert res["status"] == "success"
    assert res["metrics"]["r2_score"] > 0
    assert "intercept" in res["inspection"]

def test_train_decision_tree_feature_importances(ml_service):
    res = ml_service.train(
        features=["MedInc", "HouseAge", "AveRooms", "Latitude", "Longitude"],
        algorithm="decision_tree",
        hyperparameters={"max_depth": 5}
    )
    assert res["status"] == "success"
    assert "feature_importances" in res["inspection"]
    # Check that MedInc has the highest importance in California housing
    importances = res["inspection"]["feature_importances"]
    assert importances["MedInc"] > 0.30

def test_train_random_forest(ml_service):
    res = ml_service.train(
        features=["MedInc", "HouseAge", "Latitude", "Longitude"],
        algorithm="random_forest",
        hyperparameters={"n_estimators": 20, "max_depth": 6}
    )
    assert res["status"] == "success"
    assert res["metrics"]["r2_score"] > 0.50

def test_empty_features_raises_value_error(ml_service):
    with pytest.raises(ValueError, match="At least one feature must be selected"):
        ml_service.train(features=[])

def test_invalid_algorithm_raises_error(ml_service):
    with pytest.raises(ValueError, match="Unsupported algorithm"):
        ml_service.train(features=["MedInc"], algorithm="quantum_neural_net")

def test_prediction_inference(ml_service):
    # Train first
    ml_service.train(
        features=["MedInc", "HouseAge"],
        algorithm="linear_regression"
    )
    # Predict for higher income
    pred_rich = ml_service.predict({"MedInc": 8.0, "HouseAge": 25.0})
    # Predict for lower income
    pred_poor = ml_service.predict({"MedInc": 2.0, "HouseAge": 25.0})

    assert pred_rich["prediction"] > pred_poor["prediction"]
    assert "estimated_value_dollars" in pred_rich
