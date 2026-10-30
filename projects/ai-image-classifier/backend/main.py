"""
FastAPI Server for AI Image Classifier.
Runs on Port 8005.
"""
import os
import io
import base64
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional
from PIL import Image

from vision_service import VisionClassificationService

app = FastAPI(
    title="Wrench Wise · AI Image Classifier API",
    description="Real-time ImageNet Deep Learning CNN inference with ONNX Runtime",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = VisionClassificationService()

class ClassifyBase64Request(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image string")
    top_k: int = Field(5, ge=1, le=20)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "AI Image Classifier API",
        "model": "SqueezeNet 1.1 ONNX",
        "classes_loaded": len(service.classes)
    }

@app.get("/api/samples")
def get_samples():
    try:
        return service.get_sample_images()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/classify")
async def classify(
    file: Optional[UploadFile] = File(None),
    sample_filename: Optional[str] = Form(None),
    top_k: int = Form(5)
):
    try:
        if sample_filename:
            return service.classify_sample_by_filename(sample_filename, top_k=top_k)
        
        if file is not None:
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            
            try:
                img = Image.open(io.BytesIO(content))
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid image file format.")
            
            res = service.classify_image(img, top_k=top_k)
            res["filename"] = file.filename
            return res
        
        raise HTTPException(status_code=400, detail="Provide either an image file or sample_filename.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/api/classify-base64")
def classify_base64(req: ClassifyBase64Request):
    try:
        data = req.image_base64
        if "," in data:
            data = data.split(",", 1)[1]
        
        img_bytes = base64.b64decode(data)
        img = Image.open(io.BytesIO(img_bytes))
        return service.classify_image(img, top_k=req.top_k)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Base64 classification error: {str(e)}")

# Mount sample images for direct serving
samples_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample-images"))
if os.path.exists(samples_dir):
    app.mount("/sample-images", StaticFiles(directory=samples_dir), name="sample-images")

# Mount static frontend
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
