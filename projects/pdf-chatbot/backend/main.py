"""
FastAPI Server for PDF Chatbot (RAG).
"""
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional

from rag_service import RAGService

app = FastAPI(
    title="Wrench Wise · PDF Chatbot API",
    description="Full Retrieval-Augmented Generation (RAG) backend with PDF ingestion, chunking, vector retrieval, and citation verification",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = RAGService()

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=2, description="User question")
    top_k: int = Field(3, ge=1, le=10, description="Number of context chunks to retrieve")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "PDF Chatbot RAG API",
        "chunks_indexed": len(rag.chunks),
        "document_loaded": rag.document_info is not None
    }

@app.post("/api/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    chunk_size: int = Form(450),
    chunk_overlap: int = Form(80)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are supported.")

    try:
        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 25MB limit.")
        
        result = rag.ingest_pdf(
            file_bytes=content,
            filename=file.filename,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.get("/api/chunks")
def get_chunks():
    return {
        "total_chunks": len(rag.chunks),
        "chunks": rag.get_all_chunks()
    }

@app.post("/api/query")
def query_document(req: QueryRequest):
    try:
        return rag.answer_query(req.query, top_k=req.top_k)
    except RuntimeError as re:
        raise HTTPException(status_code=400, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")

# Mount sample documents and static frontend
sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample-documents"))
if os.path.exists(sample_dir):
    app.mount("/sample-documents", StaticFiles(directory=sample_dir), name="sample_docs")

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
