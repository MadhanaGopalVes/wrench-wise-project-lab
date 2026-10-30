"""
Automated Pytest Suite for AI Image Classifier (ONNX Runtime).
Run with: pytest projects/ai-image-classifier/tests/test_vision.py -v
"""
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import sys
import pytest
from PIL import Image
import numpy as np

# Ensure backend package is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from vision_service import VisionClassificationService

@pytest.fixture(scope="module")
def vision_service():
    return VisionClassificationService()

def test_model_and_classes_load_successfully(vision_service):
    assert vision_service.session is not None
    assert len(vision_service.classes) == 1000
    assert "golden retriever" in vision_service.classes

def test_image_preprocessing_tensor_shape(vision_service):
    dummy_img = Image.new("RGB", (300, 450), color=(128, 64, 32))
    tensor = vision_service.preprocess_image(dummy_img)
    assert tensor.shape == (1, 3, 224, 224)
    assert tensor.dtype == np.float32

def test_classify_golden_retriever_sample(vision_service):
    res = vision_service.classify_sample_by_filename("golden_retriever.jpg", top_k=5)
    assert res["status"] == "success"
    assert len(res["predictions"]) == 5
    top_pred = res["top_prediction"]
    assert "retriever" in top_pred["label"].lower() or "dog" in top_pred["label"].lower() or "chihuahua" in top_pred["label"].lower()
    assert top_pred["confidence"] > 0.20
    assert res["metrics"]["inference_time_ms"] > 0
    assert res["metrics"]["confidence_margin"] >= 0

def test_classify_sports_car_sample(vision_service):
    res = vision_service.classify_sample_by_filename("sports_car.jpg", top_k=5)
    assert res["status"] == "success"
    labels = [p["label"].lower() for p in res["predictions"]]
    assert any("car" in l or "wheel" in l or "racer" in l or "convertible" in l for l in labels)

def test_probability_distribution_normalization(vision_service):
    dummy_img = Image.new("RGB", (224, 224), color=(200, 200, 200))
    res = vision_service.classify_image(dummy_img, top_k=10)
    confs = [p["confidence"] for p in res["predictions"]]
    for c in confs:
        assert 0.0 <= c <= 1.0
    # Top 10 sum must be <= 1.0
    assert sum(confs) <= 1.0001
    assert res["metrics"]["entropy_uncertainty"] > 0

def test_get_sample_images_list(vision_service):
    samples = vision_service.get_sample_images()
    assert len(samples) >= 4
    filenames = [s["filename"] for s in samples]
    assert "golden_retriever.jpg" in filenames
    assert samples[0]["thumbnail_base64"].startswith("data:image/jpeg;base64,")

def test_missing_sample_raises_filenotfound(vision_service):
    with pytest.raises(FileNotFoundError):
        vision_service.classify_sample_by_filename("non_existent_image_12345.jpg")

if __name__ == "__main__":
    print("Running AI Image Classifier Test Suite...")
    service = VisionClassificationService()
    test_model_and_classes_load_successfully(service)
    print("PASS: test_model_and_classes_load_successfully")
    test_image_preprocessing_tensor_shape(service)
    print("PASS: test_image_preprocessing_tensor_shape")
    test_classify_golden_retriever_sample(service)
    print("PASS: test_classify_golden_retriever_sample")
    test_classify_sports_car_sample(service)
    print("PASS: test_classify_sports_car_sample")
    test_probability_distribution_normalization(service)
    print("PASS: test_probability_distribution_normalization")
    test_get_sample_images_list(service)
    print("PASS: test_get_sample_images_list")
    test_missing_sample_raises_filenotfound(service)
    print("PASS: test_missing_sample_raises_filenotfound")
    print("\nALL 7 AI IMAGE CLASSIFIER TESTS PASSED SUCCESSFULLY!")
