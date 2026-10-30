"""
FastAPI Backend for ML Model Builder.
Provides REST endpoints for dataset inspection, model training, evaluation, and inference.
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from model_service import MLModelService

app = FastAPI(
    title="Wrench Wise · ML Model Builder API",
    description="Interactive Scikit-learn regression training, evaluation, and inference engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = MLModelService()

class TrainRequest(BaseModel):
    features: List[str] = Field(..., description="List of feature column names")
    target: str = Field("MedHouseVal", description="Target column name")
    algorithm: str = Field("linear_regression", description="Algorithm identifier")
    hyperparameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    test_size: float = Field(0.2, ge=0.05, le=0.5, description="Fraction of data for test split")
    random_state: int = Field(42, description="Random seed")
    scaling: str = Field("standard", description="Scaling method: standard, minmax, none")

class PredictRequest(BaseModel):
    feature_values: Dict[str, float] = Field(..., description="Dict mapping feature name to numerical value")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ML Model Builder API", "rows_loaded": len(service.df) if service.df is not None else 0}

@app.get("/api/dataset")
def get_dataset():
    try:
        return service.get_dataset_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train")
def train_model(req: TrainRequest):
    try:
        result = service.train(
            features=req.features,
            target=req.target,
            algorithm=req.algorithm,
            hyperparameters=req.hyperparameters,
            test_size=req.test_size,
            random_state=req.random_state,
            scaling=req.scaling
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/api/predict")
def predict_model(req: PredictRequest):
    try:
        return service.predict(req.feature_values)
    except RuntimeError as re:
        raise HTTPException(status_code=400, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Mount static frontend
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
