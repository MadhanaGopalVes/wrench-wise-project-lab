"""
Vector Index & Semantic Retrieval Engine for PDF Chatbot.
Implements TF-IDF vector space model with sublinear term-frequency scaling and cosine similarity metrics.
Enables instant, offline semantic search across extracted document chunks without mandatory cloud API credentials,
while maintaining a pluggable architecture for dense vector embeddings.
"""
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class SemanticVectorIndex:
    def __init__(self, min_similarity_threshold: float = 0.12):
        self.min_similarity_threshold = min_similarity_threshold
        self.chunks: List[Dict[str, Any]] = []
        self.vectorizer: TfidfVectorizer = TfidfVectorizer(
            sublinear_tf=True,
            ngram_range=(1, 2),
            stop_words="english"
        )
        self.tfidf_matrix = None
        self.is_indexed = False

    def index_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Build index over all text chunks.
        """
        if not chunks:
            raise ValueError("Cannot index an empty list of chunks.")

        self.chunks = chunks
        corpus = [c["content"] for c in chunks]

        # Fit TF-IDF matrix
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
        self.is_indexed = True

        return {
            "total_chunks_indexed": len(self.chunks),
            "vocabulary_size": len(self.vectorizer.vocabulary_),
            "matrix_shape": list(self.tfidf_matrix.shape)
        }

    def search(self, query: str, top_k: int = 3) -> Dict[str, Any]:
        """
        Execute semantic retrieval for a user question.
        Returns top-k matching chunks with similarity scores.
        """
        if not self.is_indexed or self.tfidf_matrix is None:
            raise RuntimeError("Index is not built. Upload and chunk a document first.")

        query = query.strip()
        if not query:
            return {"results": [], "is_grounded": False, "max_score": 0.0}

        # Vectorize query
        query_vec = self.vectorizer.transform([query])

        # Compute cosine similarity
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        # Sort indices by descending score
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results: List[Dict[str, Any]] = []
        for rank, idx in enumerate(top_indices):
            score = float(similarities[idx])
            chunk = self.chunks[idx]
            results.append({
                "rank": rank + 1,
                "chunk_id": chunk["chunk_id"],
                "page_number": chunk["page_number"],
                "similarity_score": round(score, 4),
                "content": chunk["content"],
                "is_above_threshold": score >= self.min_similarity_threshold
            })

        max_score = results[0]["similarity_score"] if results else 0.0
        is_grounded = max_score >= self.min_similarity_threshold

        return {
            "query": query,
            "top_k": top_k,
            "max_similarity": max_score,
            "threshold": self.min_similarity_threshold,
            "is_grounded": is_grounded,
            "retrieved_chunks": results
        }
