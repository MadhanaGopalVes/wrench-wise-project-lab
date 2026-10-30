"""
Automated Pytest Suite for PDF Chatbot (RAG Pipeline).
Run with: pytest projects/pdf-chatbot/tests/test_rag_pipeline.py -v
"""
import pytest
import os
import sys

# Add project modules to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
doc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "document-processing"))
retrieval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "retrieval"))
sys.path.insert(0, backend_path)
sys.path.insert(0, doc_path)
sys.path.insert(0, retrieval_path)

from extractor import PDFExtractor
from chunker import DocumentChunker
from vector_store import SemanticVectorIndex
from rag_service import RAGService

SAMPLE_PDF = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample-documents", "wrenchwise_ai_handbook.pdf"))

@pytest.fixture(scope="module")
def sample_pdf_bytes():
    with open(SAMPLE_PDF, "rb") as f:
        return f.read()

def test_pdf_extraction(sample_pdf_bytes):
    extracted = PDFExtractor.extract_from_bytes(sample_pdf_bytes, "test_manual.pdf")
    assert extracted["metadata"]["total_pages"] == 2
    assert "RouteOptima" in extracted["full_text"]
    assert "TLS 1.3" in extracted["full_text"]
    assert len(extracted["pages"]) == 2
    assert extracted["pages"][0]["page_number"] == 1
    assert extracted["pages"][1]["page_number"] == 2

def test_document_chunking():
    sample_pages = [
        {"page_number": 1, "text": "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega."},
        {"page_number": 2, "text": "Machine learning systems require data validation and rigorous testing protocols for enterprise deployment."}
    ]
    chunker = DocumentChunker(chunk_size=50, chunk_overlap=15)
    chunks = chunker.chunk_pages(sample_pages)

    assert len(chunks) >= 2
    assert chunks[0]["page_number"] == 1
    assert "chunk_id" in chunks[0]
    assert chunks[0]["character_count"] > 0
    assert chunks[-1]["page_number"] == 2

def test_vector_indexing_and_search():
    chunks = [
        {"chunk_id": "c1", "page_number": 1, "content": "The dispatch interval for autonomous delivery fleets is exactly 120 seconds."},
        {"chunk_id": "c2", "page_number": 2, "content": "All network communications are encrypted with TLS 1.3 and RSA-4096 keys."},
        {"chunk_id": "c3", "page_number": 3, "content": "Customer refund policies allow returns within a 30-day window."}
    ]
    index = SemanticVectorIndex(min_similarity_threshold=0.10)
    stats = index.index_chunks(chunks)

    assert stats["total_chunks_indexed"] == 3
    assert stats["vocabulary_size"] > 5

    # Query 1: Dispatch query
    res = index.search("dispatch interval seconds", top_k=2)
    assert res["is_grounded"] is True
    assert res["retrieved_chunks"][0]["chunk_id"] == "c1"
    assert res["retrieved_chunks"][0]["page_number"] == 1

    # Query 2: Encryption query
    res2 = index.search("encryption RSA security", top_k=2)
    assert res2["is_grounded"] is True
    assert res2["retrieved_chunks"][0]["chunk_id"] == "c2"

def test_rag_end_to_end_grounded_answer(sample_pdf_bytes):
    rag = RAGService()
    ingest_result = rag.ingest_pdf(sample_pdf_bytes, "manual.pdf", chunk_size=300, chunk_overlap=50)

    assert ingest_result["status"] == "success"
    assert ingest_result["document"]["total_pages"] == 2

    # Query 1: Fact in document
    res = rag.answer_query("What is the dispatch interval?")
    assert res["is_supported"] is True
    assert "120 seconds" in res["answer"]
    assert len(res["citations"]) > 0
    assert res["citations"][0]["page_number"] == 1

    # Query 2: Fact on page 2
    res2 = rag.answer_query("What is the SLA uptime?")
    assert res2["is_supported"] is True
    assert "99.95%" in res2["answer"]
    assert res2["citations"][0]["page_number"] == 2

def test_rag_out_of_context_refusal(sample_pdf_bytes):
    rag = RAGService()
    rag.ingest_pdf(sample_pdf_bytes, "manual.pdf")

    # Ask completely unrelated query
    res = rag.answer_query("What ingredients are needed to bake sourdough bread?")
    assert res["is_supported"] is False
    assert "outside the scope" in res["answer"]
    assert len(res["citations"]) == 0

def test_corrupted_pdf_error_handling():
    corrupted_bytes = b"NOT_A_VALID_PDF_HEADER_JUST_GARBAGE"
    with pytest.raises(ValueError, match="Failed to parse PDF"):
        PDFExtractor.extract_from_bytes(corrupted_bytes)
