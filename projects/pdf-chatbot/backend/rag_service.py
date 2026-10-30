"""
RAG Service: Ingestion, Retrieval, Context Synthesis, and Citations.
Implements the complete Retrieval-Augmented Generation lifecycle.
"""
import os
import re
import sys
from typing import Dict, Any, List, Optional

# Add sibling directories to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, os.path.join(parent_dir, "document-processing"))
sys.path.insert(0, os.path.join(parent_dir, "retrieval"))

from extractor import PDFExtractor
from chunker import DocumentChunker
from vector_store import SemanticVectorIndex

class RAGService:
    def __init__(self):
        self.extractor = PDFExtractor()
        self.chunker = DocumentChunker(chunk_size=450, chunk_overlap=80)
        self.vector_index = SemanticVectorIndex(min_similarity_threshold=0.10)
        self.document_info: Optional[Dict[str, Any]] = None
        self.extracted_pages: List[Dict[str, Any]] = []
        self.chunks: List[Dict[str, Any]] = []

    def ingest_pdf(self, file_bytes: bytes, filename: str, chunk_size: int = 450, chunk_overlap: int = 80) -> Dict[str, Any]:
        """
        Full PDF ingestion pipeline:
        1. Extract text and pages via pypdf.
        2. Chunk text with overlap.
        3. Build vector index.
        """
        # Step 1: Extraction
        extracted = self.extractor.extract_from_bytes(file_bytes, filename)
        self.document_info = extracted["metadata"]
        self.extracted_pages = extracted["pages"]

        # Step 2: Chunking
        self.chunker = DocumentChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.chunks = self.chunker.chunk_pages(self.extracted_pages)

        # Step 3: Vector Indexing
        index_stats = self.vector_index.index_chunks(self.chunks)

        return {
            "status": "success",
            "document": self.document_info,
            "total_chunks": len(self.chunks),
            "index_stats": index_stats,
            "sample_chunks": self.chunks[:3]
        }

    def answer_query(self, query: str, top_k: int = 3) -> Dict[str, Any]:
        """
        Given a user question:
        1. Query vector index for top-k chunks.
        2. Check similarity against grounding threshold.
        3. If not grounded, return refusal.
        4. If grounded, synthesize answer grounded strictly in retrieved context with citations.
        """
        if not self.chunks:
            raise RuntimeError("No document has been uploaded yet. Upload a PDF first.")

        search_result = self.vector_index.search(query, top_k=top_k)
        retrieved_chunks = search_result["retrieved_chunks"]
        is_grounded = search_result["is_grounded"]

        # Unsupported question guardrail
        if not is_grounded or not retrieved_chunks:
            return {
                "query": query,
                "is_supported": False,
                "answer": (
                    "I cannot find sufficient evidence in the uploaded document to answer your question. "
                    "The query appears to be outside the scope of the provided text."
                ),
                "citations": [],
                "retrieval_trace": search_result,
                "grounding_confidence": round(search_result["max_similarity"], 4)
            }

        # Filter only chunks meeting relevance threshold
        relevant_chunks = [c for c in retrieved_chunks if c["is_above_threshold"]]
        if not relevant_chunks:
            relevant_chunks = [retrieved_chunks[0]]

        # Synthesize answer from relevant chunks
        answer, citations = self._synthesize_answer(query, relevant_chunks)

        return {
            "query": query,
            "is_supported": True,
            "answer": answer,
            "citations": citations,
            "retrieval_trace": search_result,
            "grounding_confidence": round(search_result["max_similarity"], 4)
        }

    def _synthesize_answer(self, query: str, relevant_chunks: List[Dict[str, Any]]) -> (str, List[Dict[str, Any]]):
        """
        Synthesizes an answer grounded strictly in retrieved chunks, extracting key sentences and referencing pages.
        """
        citations = []
        for c in relevant_chunks:
            citations.append({
                "page_number": c["page_number"],
                "chunk_id": c["chunk_id"],
                "similarity_score": c["similarity_score"],
                "excerpt": c["content"][:160] + "..." if len(c["content"]) > 160 else c["content"]
            })

        # Check for query terms matching sentences in retrieved chunks
        query_words = set(re.findall(r'\w+', query.lower())) - {"what", "is", "the", "are", "how", "why", "which", "and", "or", "to", "in", "of"}
        
        selected_sentences = []
        for chunk in relevant_chunks:
            sentences = re.split(r'(?<=[.!?])\s+', chunk["content"])
            for s in sentences:
                s_words = set(re.findall(r'\w+', s.lower()))
                overlap = query_words.intersection(s_words)
                if overlap:
                    selected_sentences.append({
                        "sentence": s.strip(),
                        "score": len(overlap),
                        "page": chunk["page_number"]
                    })

        # Sort selected sentences by term match overlap
        selected_sentences.sort(key=lambda x: x["score"], reverse=True)

        if selected_sentences:
            top_s = selected_sentences[:3]
            answer_parts = [f"{item['sentence']} [Page {item['page']}]" for item in top_s]
            answer_body = " ".join(answer_parts)
        else:
            # Fallback to leading content of top chunk
            top_chunk = relevant_chunks[0]
            answer_body = f"According to the document: \"{top_chunk['content'][:300]}...\" [Page {top_chunk['page_number']}]"

        return answer_body, citations

    def get_all_chunks(self) -> List[Dict[str, Any]]:
        return self.chunks
