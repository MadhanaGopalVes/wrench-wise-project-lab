"""
FastAPI Server for Recommendation Engine.
Runs on Port 8006.
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional

from recommender_service import RecommenderService

app = FastAPI(
    title="Wrench Wise · Recommendation Engine API",
    description="Hybrid content-based and collaborative filtering recommendation engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = RecommenderService()

class RecommendRequest(BaseModel):
    user_id: str = Field("user_001", description="Active learner user ID")
    mode: str = Field("hybrid", description="Recommendation algorithm: hybrid, content, collaborative")
    alpha: float = Field(0.5, ge=0.0, le=1.0, description="Hybrid weight: 1.0 = Pure Content, 0.0 = Pure Collaborative")
    top_k: int = Field(5, ge=1, le=20)

class RateRequest(BaseModel):
    user_id: str
    item_id: str
    rating: float = Field(..., ge=1.0, le=5.0)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Recommendation Engine API",
        "items_count": len(service.df_items) if service.df_items is not None else 0,
        "ratings_count": len(service.df_ratings) if service.df_ratings is not None else 0
    }

@app.get("/api/catalog")
def get_catalog():
    try:
        return service.get_catalog_and_users()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user-ratings")
def get_user_ratings(user_id: str = "user_001"):
    try:
        return service.get_user_ratings(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rate")
def rate_item(req: RateRequest):
    try:
        service.add_user_rating(req.user_id, req.item_id, req.rating)
        return {
            "status": "success",
            "message": f"Rating {req.rating} recorded for {req.item_id} by {req.user_id}."
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record rating: {str(e)}")

@app.post("/api/recommend")
def get_recommendations(req: RecommendRequest):
    try:
        return service.recommend(
            user_id=req.user_id,
            mode=req.mode,
            alpha=req.alpha,
            top_k=req.top_k
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

# Mount static frontend
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
