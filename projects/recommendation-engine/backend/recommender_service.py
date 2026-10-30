"""
Recommender System Service.
Implements:
1. Content-Based Filtering (TF-IDF + Cosine Similarity)
2. Collaborative Filtering (User-Based Pearson/Cosine Similarity)
3. Hybrid Recommender with adjustable alpha weighting and cold-start fallback.
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
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
ITEMS_PATH = os.path.join(DATA_DIR, "items.csv")
RATINGS_PATH = os.path.join(DATA_DIR, "ratings.csv")

class RecommenderService:
    def __init__(self, items_path: str = ITEMS_PATH, ratings_path: str = RATINGS_PATH):
        self.items_path = items_path
        self.ratings_path = ratings_path
        self.df_items: Optional[pd.DataFrame] = None
        self.df_ratings: Optional[pd.DataFrame] = None
        self.tfidf_vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix: Optional[np.ndarray] = None
        self.content_sim_matrix: Optional[np.ndarray] = None
        self.user_item_matrix: Optional[pd.DataFrame] = None
        self.user_similarity_matrix: Optional[pd.DataFrame] = None
        self.item_id_to_idx: Dict[str, int] = {}
        self.idx_to_item_id: Dict[int, str] = {}
        self.load_and_build_models()

    def load_and_build_models(self):
        if not os.path.exists(self.items_path):
            raise FileNotFoundError(f"Items dataset not found at {self.items_path}")
        if not os.path.exists(self.ratings_path):
            raise FileNotFoundError(f"Ratings dataset not found at {self.ratings_path}")

        self.df_items = pd.read_csv(self.items_path)
        self.df_ratings = pd.read_csv(self.ratings_path)

        for idx, item_id in enumerate(self.df_items["item_id"]):
            self.item_id_to_idx[item_id] = idx
            self.idx_to_item_id[idx] = item_id

        self.build_content_model()
        self.build_collaborative_model()

    def build_content_model(self):
        """
        Builds TF-IDF vector representations across item metadata.
        """
        # Combine title, category, description, and level into semantic text document
        corpus = (
            self.df_items["category"] + " " +
            self.df_items["title"] + " " +
            self.df_items["description"] + " " +
            self.df_items["level"]
        ).tolist()

        self.tfidf_vectorizer = TfidfVectorizer(stop_words="english")
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(corpus)
        # Compute item-to-item cosine similarity matrix
        self.content_sim_matrix = cosine_similarity(self.tfidf_matrix, self.tfidf_matrix)

    def build_collaborative_model(self):
        """
        Builds User-Item interaction matrix and User-User Cosine Similarity.
        """
        self.user_item_matrix = self.df_ratings.pivot_table(
            index="user_id",
            columns="item_id",
            values="rating"
        ).fillna(0.0)

        # Compute cosine similarity between user rating vectors
        user_sims = cosine_similarity(self.user_item_matrix)
        self.user_similarity_matrix = pd.DataFrame(
            user_sims,
            index=self.user_item_matrix.index,
            columns=self.user_item_matrix.index
        )

    def get_catalog_and_users(self) -> Dict[str, Any]:
        """
        Returns full items catalog, categories, and active user list for UI.
        """
        users = sorted(self.df_ratings["user_id"].unique().tolist())
        items = self.df_items.to_dict(orient="records")
        categories = sorted(self.df_items["category"].unique().tolist())

        return {
            "total_items": len(items),
            "total_ratings": len(self.df_ratings),
            "total_users": len(users),
            "categories": categories,
            "items": items,
            "sample_users": users[:15]
        }

    def get_user_ratings(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves user's rating history joined with item details.
        """
        user_df = self.df_ratings[self.df_ratings["user_id"] == user_id]
        if user_df.empty:
            return []

        merged = user_df.merge(self.df_items, on="item_id", how="left")
        return merged.sort_values(by="rating", ascending=False).to_dict(orient="records")

    def add_user_rating(self, user_id: str, item_id: str, rating: float):
        """
        Records an interaction and rebuilds collaborative model on the fly.
        """
        if item_id not in self.item_id_to_idx:
            raise ValueError(f"Unknown item_id: {item_id}")
        if not (1.0 <= rating <= 5.0):
            raise ValueError("Rating must be between 1.0 and 5.0")

        # Check existing
        existing_idx = self.df_ratings[
            (self.df_ratings["user_id"] == user_id) & (self.df_ratings["item_id"] == item_id)
        ].index

        if len(existing_idx) > 0:
            self.df_ratings.loc[existing_idx, "rating"] = rating
        else:
            new_row = pd.DataFrame([{"user_id": user_id, "item_id": item_id, "rating": rating}])
            self.df_ratings = pd.concat([self.df_ratings, new_row], ignore_index=True)

        self.build_collaborative_model()

    def recommend(
        self,
        user_id: str,
        mode: str = "hybrid",
        alpha: float = 0.5,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Generates recommendations based on content, collaborative, or hybrid strategies.
        """
        start_time = time.perf_counter()

        # Find items already rated by user
        rated_items = set(self.df_ratings[self.df_ratings["user_id"] == user_id]["item_id"])
        all_item_ids = list(self.df_items["item_id"])
        unrated_item_ids = [iid for iid in all_item_ids if iid not in rated_items]

        # Cold-start fallback if user has no ratings
        if len(rated_items) == 0:
            top_popular = self.df_items.sort_values(by="avg_rating", ascending=False).head(top_k)
            recommendations = []
            for _, r in top_popular.iterrows():
                recommendations.append({
                    "item_id": r["item_id"],
                    "title": r["title"],
                    "category": r["category"],
                    "level": r["level"],
                    "avg_rating": r["avg_rating"],
                    "match_score": 0.85,
                    "match_percentage": 85.0,
                    "reason": "Top-rated benchmark course (Cold-start initial recommendation)."
                })
            return {
                "status": "success",
                "user_id": user_id,
                "mode": "cold_start_popularity",
                "alpha": alpha,
                "recommendations": recommendations,
                "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 2)
            }

        # 1. Content-Based Scoring
        # Build user profile vector from positive ratings (>= 3.5)
        user_history = self.df_ratings[
            (self.df_ratings["user_id"] == user_id) & (self.df_ratings["rating"] >= 3.5)
        ]
        
        content_scores: Dict[str, float] = {}
        top_seed_title = "your previous courses"

        if not user_history.empty:
            weights = user_history["rating"].values
            indices = [self.item_id_to_idx[iid] for iid in user_history["item_id"]]
            
            # Highest rated course for explanation
            top_seed_id = user_history.sort_values(by="rating", ascending=False).iloc[0]["item_id"]
            top_seed_title = self.df_items[self.df_items["item_id"] == top_seed_id].iloc[0]["title"]

            # Weighted user profile vector
            user_profile_vec = np.average(self.tfidf_matrix[indices].toarray(), axis=0, weights=weights)
            user_profile_vec = user_profile_vec.reshape(1, -1)

            # Cosine similarity against unrated items
            for iid in unrated_item_ids:
                idx = self.item_id_to_idx[iid]
                item_vec = self.tfidf_matrix[idx].toarray()
                sim = float(cosine_similarity(user_profile_vec, item_vec)[0][0])
                content_scores[iid] = max(0.0, sim)
        else:
            for iid in unrated_item_ids:
                content_scores[iid] = 0.5

        # 2. Collaborative Filtering Scoring
        collab_scores: Dict[str, float] = {}
        if user_id in self.user_similarity_matrix.index:
            # Top similar users (excluding self)
            sim_users = self.user_similarity_matrix.loc[user_id].drop(user_id)
            top_neighbors = sim_users[sim_users > 0].sort_values(ascending=False).head(15)

            if not top_neighbors.empty:
                for iid in unrated_item_ids:
                    # Neighbor ratings for this item
                    neighbor_ratings = self.user_item_matrix.loc[top_neighbors.index, iid]
                    active_neighbors = neighbor_ratings[neighbor_ratings > 0]
                    
                    if not active_neighbors.empty:
                        sim_weights = top_neighbors.loc[active_neighbors.index]
                        pred_rating = np.dot(active_neighbors, sim_weights) / np.sum(sim_weights)
                        # Normalize 1-5 rating into [0, 1]
                        collab_scores[iid] = float(np.clip((pred_rating - 1.0) / 4.0, 0.0, 1.0))
                    else:
                        collab_scores[iid] = 0.3
            else:
                for iid in unrated_item_ids:
                    collab_scores[iid] = 0.3
        else:
            for iid in unrated_item_ids:
                collab_scores[iid] = 0.3

        # 3. Combine scores based on mode
        final_scores: List[Dict[str, Any]] = []
        for iid in unrated_item_ids:
            c_score = content_scores.get(iid, 0.0)
            cf_score = collab_scores.get(iid, 0.0)

            if mode == "content":
                score = c_score
                reason = f"High content similarity with '{top_seed_title}'."
            elif mode == "collaborative":
                score = cf_score
                reason = f"Learners with similar taste gave this high ratings."
            else:  # hybrid
                score = alpha * c_score + (1.0 - alpha) * cf_score
                reason = f"Balanced match: {int(alpha*100)}% content overlap + {int((1-alpha)*100)}% peer recommendations."

            item_info = self.df_items[self.df_items["item_id"] == iid].iloc[0]
            final_scores.append({
                "item_id": iid,
                "title": item_info["title"],
                "category": item_info["category"],
                "level": item_info["level"],
                "avg_rating": item_info["avg_rating"],
                "content_score": round(c_score, 4),
                "collab_score": round(cf_score, 4),
                "match_score": round(score, 4),
                "match_percentage": round(score * 100, 1),
                "reason": reason
            })

        # Sort descending by match score
        final_scores.sort(key=lambda x: x["match_score"], reverse=True)
        top_recs = final_scores[:top_k]

        return {
            "status": "success",
            "user_id": user_id,
            "mode": mode,
            "alpha": alpha,
            "user_ratings_count": len(rated_items),
            "recommendations": top_recs,
            "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 2)
        }
