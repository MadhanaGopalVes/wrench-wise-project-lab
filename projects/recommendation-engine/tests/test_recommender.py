"""
Automated Pytest Suite for Recommendation Engine.
Run with: pytest projects/recommendation-engine/tests/test_recommender.py -v
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

from recommender_service import RecommenderService

@pytest.fixture(scope="module")
def recommender_service():
    return RecommenderService()

def test_datasets_load_successfully(recommender_service):
    cat = recommender_service.get_catalog_and_users()
    assert cat["total_items"] == 25
    assert cat["total_ratings"] >= 1000
    assert cat["total_users"] >= 50
    assert "AI & ML" in cat["categories"]
    assert "Generative AI" in cat["categories"]

def test_tfidf_content_model_built(recommender_service):
    assert recommender_service.tfidf_matrix is not None
    assert recommender_service.tfidf_matrix.shape[0] == 25
    assert recommender_service.content_sim_matrix.shape == (25, 25)

def test_collaborative_filtering_matrix_built(recommender_service):
    assert recommender_service.user_item_matrix is not None
    assert recommender_service.user_similarity_matrix is not None
    assert recommender_service.user_similarity_matrix.shape[0] >= 50

def test_recommend_existing_user_hybrid(recommender_service):
    res = recommender_service.recommend("user_001", mode="hybrid", alpha=0.5, top_k=5)
    assert res["status"] == "success"
    assert len(res["recommendations"]) == 5
    for rec in res["recommendations"]:
        assert "item_id" in rec
        assert "title" in rec
        assert 0.0 <= rec["match_score"] <= 1.0
        assert "reason" in rec

def test_cold_start_fallback_new_user(recommender_service):
    res = recommender_service.recommend("brand_new_student_9999", mode="hybrid", top_k=4)
    assert res["status"] == "success"
    assert res["mode"] == "cold_start_popularity"
    assert len(res["recommendations"]) == 4

def test_pure_content_vs_pure_collaborative_modes(recommender_service):
    content_res = recommender_service.recommend("user_002", mode="content", top_k=3)
    collab_res = recommender_service.recommend("user_002", mode="collaborative", top_k=3)
    assert content_res["status"] == "success"
    assert collab_res["status"] == "success"

def test_add_rating_and_rebuild(recommender_service):
    user_id = "test_learner_live"
    # Initially cold start
    init_res = recommender_service.recommend(user_id, top_k=3)
    assert init_res["mode"] == "cold_start_popularity"

    # Add 5-star rating for Generative AI RAG course
    recommender_service.add_user_rating(user_id, "c201", 5.0)
    user_ratings = recommender_service.get_user_ratings(user_id)
    assert len(user_ratings) == 1
    assert user_ratings[0]["item_id"] == "c201"

    # Now recommendations should be tailored
    updated_res = recommender_service.recommend(user_id, mode="content", top_k=3)
    assert updated_res["mode"] == "content"
    # Should recommend related courses (c202, c204, c205)
    rec_ids = [r["item_id"] for r in updated_res["recommendations"]]
    assert any(rid in ["c202", "c204", "c205", "c203"] for rid in rec_ids)

def test_invalid_rating_value_raises_error(recommender_service):
    with pytest.raises(ValueError):
        recommender_service.add_user_rating("user_001", "c101", 7.5)

if __name__ == "__main__":
    print("Running Recommendation Engine Test Suite...")
    service = RecommenderService()
    test_datasets_load_successfully(service)
    print("PASS: test_datasets_load_successfully")
    test_tfidf_content_model_built(service)
    print("PASS: test_tfidf_content_model_built")
    test_collaborative_filtering_matrix_built(service)
    print("PASS: test_collaborative_filtering_matrix_built")
    test_recommend_existing_user_hybrid(service)
    print("PASS: test_recommend_existing_user_hybrid")
    test_cold_start_fallback_new_user(service)
    print("PASS: test_cold_start_fallback_new_user")
    test_pure_content_vs_pure_collaborative_modes(service)
    print("PASS: test_pure_content_vs_pure_collaborative_modes")
    test_add_rating_and_rebuild(service)
    print("PASS: test_add_rating_and_rebuild")
    test_invalid_rating_value_raises_error(service)
    print("PASS: test_invalid_rating_value_raises_error")
    print("\nALL 8 RECOMMENDATION ENGINE TESTS PASSED SUCCESSFULLY!")
