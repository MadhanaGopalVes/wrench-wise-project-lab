# Build Your Own PDF Chatbot (RAG) · Wrench Wise Project Lab

A standalone, fully functional Retrieval-Augmented Generation (RAG) application built with **FastAPI**, **pypdf**, **scikit-learn**, and modern browser UI.

Learners upload custom PDF documents, inspect the extracted text, configure chunking token bounds and overlap, monitor vector space index creation, execute semantic queries, inspect retrieved chunks with cosine similarity ranking, verify exact page provenance citations, and observe how out-of-context queries trigger grounded refusal guardrails.

---

## 1. Directory Structure

```text
projects/pdf-chatbot/
├── backend/
│   ├── main.py                   # FastAPI REST API & static server
│   ├── rag_service.py            # RAG controller, grounded answering & citations
│   └── requirements.txt
├── document-processing/
│   └── extractor.py              # Real PDF text & metadata extraction with pypdf
├── retrieval/
│   ├── chunker.py                # Sliding-window recursive text chunker
│   └── vector_store.py           # TF-IDF vector space model & Cosine Similarity search
├── sample-documents/
│   └── wrenchwise_ai_handbook.pdf# Sample multi-page platform handbook
├── frontend/
│   ├── index.html                # Interactive UI with upload, chunk visualizer & chat
│   ├── app.js                    # Controller & retrieval inspector renderer
│   └── style.css                 # Clean Wrench Wise tokens
├── tests/
│   └── test_rag_pipeline.py      # Automated pytest suite (6 test cases)
└── README.md
```

---

## 2. Quickstart & Execution

### Prerequisites
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `pypdf`, `scikit-learn`, `pytest`

### Step 1: Install Dependencies
```bash
cd projects/pdf-chatbot
pip install -r backend/requirements.txt
```

### Step 2: Run Automated Tests
```bash
pytest tests/test_rag_pipeline.py -v
```
All 6 test cases verify PDF extraction, chunking boundary preservation, vector indexing, top-k retrieval, fact extraction with page citations, out-of-context refusal, and corrupt file error handling.

### Step 3: Launch the Application
```bash
python backend/main.py
```
Open [http://localhost:8002](http://localhost:8002) in your browser.

---

## 3. API Endpoints

- `GET /health`: Healthcheck verifying number of indexed chunks and document state.
- `POST /api/upload`: Multipart file upload accepting `.pdf` documents with optional `chunk_size` and `chunk_overlap` form parameters.
- `GET /api/chunks`: Returns all extracted passages with page provenance and start/end character offsets.
- `POST /api/query`:
  - Request body:
    ```json
    {
      "query": "What is the dispatch interval?",
      "top_k": 3
    }
    ```
  - Response: Grounded answer, citation list with page numbers, and complete `retrieval_trace` showing ranked chunks and cosine similarities.
