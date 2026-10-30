"""
FastAPI Server for Customer Churn Prediction.
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from churn_service import ChurnService

app = FastAPI(
    title="Wrench Wise · Customer Churn Prediction API",
    description="Interactive telecom churn classification, confusion matrix evaluation, and customer risk scoring engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = ChurnService()

class TrainRequest(BaseModel):
    features: Optional[List[str]] = None
    algorithm: str = Field("random_forest", description="Classification algorithm")
    hyperparameters: Optional[Dict[str, Any]] = None
    test_size: float = Field(0.2, ge=0.1, le=0.4)
    random_state: int = 42

class PredictRequest(BaseModel):
    customer_profile: Dict[str, Any] = Field(..., description="Customer profile attributes")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Customer Churn Prediction API",
        "records_loaded": len(service.df) if service.df is not None else 0
    }

@app.get("/api/dataset")
def get_dataset():
    try:
        return service.get_dataset_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train")
def train_model(req: TrainRequest):
    try:
        return service.train(
            features=req.features,
            algorithm=req.algorithm,
            hyperparameters=req.hyperparameters,
            test_size=req.test_size,
            random_state=req.random_state
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/api/predict")
def predict_churn(req: PredictRequest):
    try:
        return service.predict_churn_risk(req.customer_profile)
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
    uvicorn.run(app, host="0.0.0.0", port=8004)
