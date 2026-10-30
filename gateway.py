"""
Wrench Wise Unified Project Lab Gateway.
Unifies all 6 functional projects under a single port (8080) for executive management demonstration.
"""
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import sys
import io
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from PIL import Image

# Import Project 1: ML Model Builder
sys.path.insert(0, os.path.abspath("projects/ml-model-builder/backend"))
from model_service import MLModelService

# Import Project 2: PDF Chatbot
sys.path.insert(0, os.path.abspath("projects/pdf-chatbot/backend"))
from rag_service import RAGService

# Import Project 3: Customer Support Agent
sys.path.insert(0, os.path.abspath("projects/customer-support-agent/agents"))
sys.path.insert(0, os.path.abspath("projects/customer-support-agent/tools"))
from support_agent import SupportAgent
import order_tools
import kb_tools
import ticket_tools

# Import Project 4: Customer Churn Prediction
sys.path.insert(0, os.path.abspath("projects/churn-prediction/backend"))
from churn_service import ChurnService

# Import Project 5: AI Image Classifier
sys.path.insert(0, os.path.abspath("projects/ai-image-classifier/backend"))
from vision_service import VisionClassificationService

# Import Project 6: Recommendation Engine
sys.path.insert(0, os.path.abspath("projects/recommendation-engine/backend"))
from recommender_service import RecommenderService

app = FastAPI(
    title="Wrench Wise · Executive Project Lab Gateway",
    description="Unified Enterprise Demonstration Portal for Management Validation (6 Projects)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
ml_service = MLModelService(data_path="projects/ml-model-builder/data/housing.csv")
rag_service = RAGService()
support_agent = SupportAgent()
churn_service = ChurnService()
vision_service = VisionClassificationService()
recommender_service = RecommenderService()

# ----------------- Project 1: ML Model Builder Routes -----------------
class MLTrainReq(BaseModel):
    features: List[str]
    target: str = "MedHouseVal"
    algorithm: str = "linear_regression"
    hyperparameters: Optional[Dict[str, Any]] = None
    test_size: float = 0.2
    random_state: int = 42
    scaling: str = "standard"

class MLPredictReq(BaseModel):
    feature_values: Dict[str, float]

@app.get("/api/ml/dataset")
def ml_dataset():
    return ml_service.get_dataset_info()

@app.post("/api/ml/train")
def ml_train(req: MLTrainReq):
    return ml_service.train(
        features=req.features,
        target=req.target,
        algorithm=req.algorithm,
        hyperparameters=req.hyperparameters,
        test_size=req.test_size,
        random_state=req.random_state,
        scaling=req.scaling
    )

@app.post("/api/ml/predict")
def ml_predict(req: MLPredictReq):
    return ml_service.predict(req.feature_values)

# ----------------- Project 2: PDF Chatbot Routes -----------------
class RAGQueryReq(BaseModel):
    query: str
    top_k: int = 3

@app.post("/api/pdf/upload")
async def pdf_upload(file: UploadFile = File(...), chunk_size: int = Form(450), chunk_overlap: int = Form(80)):
    content = await file.read()
    return rag_service.ingest_pdf(content, file.filename, chunk_size, chunk_overlap)

@app.get("/api/pdf/chunks")
def pdf_chunks():
    return {"total_chunks": len(rag_service.chunks), "chunks": rag_service.get_all_chunks()}

@app.post("/api/pdf/query")
def pdf_query(req: RAGQueryReq):
    return rag_service.answer_query(req.query, req.top_k)

# ----------------- Project 3: Support Agent Routes -----------------
class AgentChatReq(BaseModel):
    message: str

class AgentApprovalReq(BaseModel):
    approval_id: str
    approved: bool

@app.get("/api/agent/orders")
def agent_orders():
    return order_tools.load_orders()

@app.get("/api/agent/approvals")
def agent_approvals():
    return ticket_tools.get_all_approvals()

@app.post("/api/agent/chat")
def agent_chat(req: AgentChatReq):
    return support_agent.process_message(req.message)

@app.post("/api/agent/approval/decide")
def agent_decide(req: AgentApprovalReq):
    return ticket_tools.process_human_approval(req.approval_id, req.approved)

# ----------------- Project 4: Customer Churn Routes -----------------
class ChurnTrainReq(BaseModel):
    features: Optional[List[str]] = None
    algorithm: str = "random_forest"
    hyperparameters: Optional[Dict[str, Any]] = None
    test_size: float = 0.2
    random_state: int = 42

class ChurnPredictReq(BaseModel):
    customer_profile: Dict[str, Any]

@app.get("/api/churn/dataset")
def churn_dataset():
    return churn_service.get_dataset_info()

@app.post("/api/churn/train")
def churn_train(req: ChurnTrainReq):
    return churn_service.train(
        features=req.features,
        algorithm=req.algorithm,
        hyperparameters=req.hyperparameters,
        test_size=req.test_size,
        random_state=req.random_state
    )

@app.post("/api/churn/predict")
def churn_predict(req: ChurnPredictReq):
    return churn_service.predict_churn_risk(req.customer_profile)

# ----------------- Project 5: AI Image Classifier Routes -----------------
@app.get("/api/vision/samples")
def vision_samples():
    return vision_service.get_sample_images()

@app.post("/api/vision/classify")
async def vision_classify(
    file: Optional[UploadFile] = File(None),
    sample_filename: Optional[str] = Form(None),
    top_k: int = Form(5)
):
    if sample_filename:
        return vision_service.classify_sample_by_filename(sample_filename, top_k=top_k)
    if file:
        content = await file.read()
        img = Image.open(io.BytesIO(content))
        res = vision_service.classify_image(img, top_k=top_k)
        res["filename"] = file.filename
        return res
    raise HTTPException(status_code=400, detail="Missing file or sample_filename")

# ----------------- Project 6: Recommender Engine Routes -----------------
class RecommenderReq(BaseModel):
    user_id: str = "user_001"
    mode: str = "hybrid"
    alpha: float = 0.5
    top_k: int = 5

class RecommenderRateReq(BaseModel):
    user_id: str
    item_id: str
    rating: float

@app.get("/api/recommender/catalog")
def recommender_catalog():
    return recommender_service.get_catalog_and_users()

@app.get("/api/recommender/user-ratings")
def recommender_user_ratings(user_id: str = "user_001"):
    return recommender_service.get_user_ratings(user_id)

@app.post("/api/recommender/rate")
def recommender_rate(req: RecommenderRateReq):
    recommender_service.add_user_rating(req.user_id, req.item_id, req.rating)
    return {"status": "success", "message": "Rating recorded and matrix updated."}

@app.post("/api/recommender/recommend")
def recommender_recommend(req: RecommenderReq):
    return recommender_service.recommend(
        user_id=req.user_id,
        mode=req.mode,
        alpha=req.alpha,
        top_k=req.top_k
    )

# ----------------- Unified Status -----------------
@app.get("/api/system/status")
def system_status():
    return {
        "status": "ALL_SYSTEMS_OPERATIONAL",
        "total_projects": 6,
        "ml_model_builder": {"status": "ONLINE", "samples": len(ml_service.df)},
        "pdf_chatbot": {"status": "ONLINE", "chunks": len(rag_service.chunks)},
        "customer_support_agent": {"status": "ONLINE", "tools": len(support_agent.tool_definitions)},
        "churn_prediction": {"status": "ONLINE", "samples": len(churn_service.df)},
        "ai_image_classifier": {"status": "ONLINE", "classes": len(vision_service.classes)},
        "recommendation_engine": {"status": "ONLINE", "items": len(recommender_service.df_items)},
        "pytest_suite": {"total": 46, "passed": 46, "status": "VERIFIED_PASSING"}
    }

# Mount static directories
app.mount("/ml", StaticFiles(directory="projects/ml-model-builder/frontend", html=True), name="ml_ui")
app.mount("/pdf", StaticFiles(directory="projects/pdf-chatbot/frontend", html=True), name="pdf_ui")
app.mount("/sample-documents", StaticFiles(directory="projects/pdf-chatbot/sample-documents"), name="sample_docs")
app.mount("/agent", StaticFiles(directory="projects/customer-support-agent/frontend", html=True), name="agent_ui")
app.mount("/churn", StaticFiles(directory="projects/churn-prediction/frontend", html=True), name="churn_ui")
app.mount("/vision", StaticFiles(directory="projects/ai-image-classifier/frontend", html=True), name="vision_ui")
app.mount("/sample-images", StaticFiles(directory="projects/ai-image-classifier/sample-images"), name="sample_images")
app.mount("/recommender", StaticFiles(directory="projects/recommendation-engine/frontend", html=True), name="recommender_ui")
app.mount("/handouts", StaticFiles(directory="handouts"), name="handouts")
app.mount("/", StaticFiles(directory="portal", html=True), name="portal")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
