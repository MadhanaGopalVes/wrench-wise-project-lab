"""
Automated Pytest Suite for Customer Churn Prediction.
Run with: pytest projects/churn-prediction/tests/test_churn.py -v
"""
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import sys
import pytest

# Ensure backend package is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))


from churn_service import ChurnService

@pytest.fixture(scope="module")
def churn_service():
    return ChurnService()

def test_dataset_loads_correctly(churn_service):
    info = churn_service.get_dataset_info()
    assert info["total_records"] == 2500
    assert 20.0 < info["churn_rate"] < 35.0
    assert "tenure" in info["available_features"]["numeric"]
    assert "contract_type" in info["available_features"]["categorical"]

def test_train_random_forest_classification(churn_service):
    res = churn_service.train(
        algorithm="random_forest",
        hyperparameters={"n_estimators": 30, "max_depth": 6}
    )
    assert res["status"] == "success"
    metrics = res["metrics"]
    assert metrics["accuracy"] > 0.70
    assert metrics["precision"] > 0
    assert metrics["recall"] > 0
    assert metrics["f1_score"] > 0
    assert metrics["roc_auc"] > 0.70

    cm = res["confusion_matrix"]
    assert cm["true_positive"] + cm["false_positive"] + cm["true_negative"] + cm["false_negative"] == cm["total_test_samples"]
    assert len(res["top_feature_importance"]) > 0

def test_train_logistic_regression(churn_service):
    res = churn_service.train(
        features=["tenure", "monthly_charges", "contract_type"],
        algorithm="logistic_regression",
        hyperparameters={"C": 0.5}
    )
    assert res["status"] == "success"
    assert res["metrics"]["accuracy"] > 0.65

def test_train_decision_tree(churn_service):
    res = churn_service.train(
        algorithm="decision_tree",
        hyperparameters={"max_depth": 4}
    )
    assert res["status"] == "success"
    assert "top_feature_importance" in res

def test_train_gradient_boosting(churn_service):
    res = churn_service.train(
        algorithm="gradient_boosting",
        hyperparameters={"n_estimators": 25, "learning_rate": 0.1}
    )
    assert res["status"] == "success"
    assert res["metrics"]["accuracy"] > 0.70

def test_empty_features_error(churn_service):
    with pytest.raises(ValueError, match="At least one feature must be selected"):
        churn_service.train(features=[])

def test_invalid_algorithm_error(churn_service):
    with pytest.raises(ValueError, match="Unsupported algorithm"):
        churn_service.train(algorithm="deep_quantum_network")

def test_predict_churn_risk_profiles(churn_service):
    # Train robust model first
    churn_service.train(algorithm="random_forest")

    # 1. High risk customer profile: brand new, month to month, high charges, no support
    high_risk_cust = {
        "tenure": 2,
        "monthly_charges": 105.0,
        "total_charges": 210.0,
        "contract_type": "Month-to-month",
        "internet_service": "Fiber optic",
        "tech_support": "No",
        "online_security": "No",
        "paperless_billing": "Yes",
        "payment_method": "Electronic check"
    }
    high_res = churn_service.predict_churn_risk(high_risk_cust)
    assert high_res["churn_probability"] > 0.45
    assert high_res["risk_tier"] in ("HIGH", "MODERATE")
    assert "recommended_action" in high_res

    # 2. Low risk customer profile: loyal 5 years, two-year contract, low charges, tech support
    low_risk_cust = {
        "tenure": 60,
        "monthly_charges": 35.0,
        "total_charges": 2100.0,
        "contract_type": "Two year",
        "internet_service": "DSL",
        "tech_support": "Yes",
        "online_security": "Yes",
        "paperless_billing": "No",
        "payment_method": "Bank transfer"
    }
    low_res = churn_service.predict_churn_risk(low_risk_cust)
    assert low_res["churn_probability"] < high_res["churn_probability"]
    assert low_res["risk_tier"] == "LOW"

if __name__ == "__main__":
    print("Running Customer Churn Prediction Test Suite...")
    service = ChurnService()
    test_dataset_loads_correctly(service)
    print("PASS: test_dataset_loads_correctly")
    test_train_random_forest_classification(service)
    print("PASS: test_train_random_forest_classification")
    test_train_logistic_regression(service)
    print("PASS: test_train_logistic_regression")
    test_train_decision_tree(service)
    print("PASS: test_train_decision_tree")
    test_train_gradient_boosting(service)
    print("PASS: test_train_gradient_boosting")
    test_empty_features_error(service)
    print("PASS: test_empty_features_error")
    test_invalid_algorithm_error(service)
    print("PASS: test_invalid_algorithm_error")
    test_predict_churn_risk_profiles(service)
    print("PASS: test_predict_churn_risk_profiles")
    print("\nALL 8 CHURN PREDICTION TESTS PASSED SUCCESSFULLY!")

