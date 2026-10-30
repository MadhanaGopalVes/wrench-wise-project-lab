# Wrench Wise Project Lab · Technical Handout
## Project 02: Build Your Own PDF Chatbot (RAG)

---

## 1. Project Objective & Industry Context

### 1.1 Objective
Build, deploy, and inspect a complete **Retrieval-Augmented Generation (RAG)** pipeline that empowers users to upload arbitrary PDF documents, process unstructured text into searchable vector chunks, semantically retrieve relevant passages with cosine similarity, generate context-grounded answers with page provenance citations, and rigorously enforce refusal guardrails when questions fall outside the document context.

### 1.2 Industry Problem
Large Language Models suffer from two fundamental operational liabilities:
1. **Knowledge Cutoffs & Hallucination**: An LLM cannot know private proprietary documents (e.g., enterprise SLAs, technical architecture specs, internal HR policies). When prompted without context, models hallucinate plausible-sounding falsehoods.
2. **Context Window Limits & Cost Inefficiency**: Stuffing an entire 200-page operational manual into an LLM context window costs significant latency, exceeds token budgets, and suffers from the "lost in the middle" degradation phenomenon.

**Retrieval-Augmented Generation (RAG)** solves this by decoupling *knowledge storage* (vector search over indexed document chunks) from *reasoning* (synthesis conditioned strictly on top-k retrieved evidence).

---

## 2. System Architecture

```text
+-------------------------------------------------------------------------+
|                              PDF INGESTION                              |
|   PDF File Bytes  ──>  pypdf.PdfReader  ──>  Page Extraction & Cleaning |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                         CHUNKING ENGINE (SLIDING)                       |
|   - Window: chunk_size (e.g. 450 chars)                                 |
|   - Overlap: chunk_overlap (e.g. 80 chars)                              |
|   - Boundary Heuristic: Breaks on punctuation ('. ', '\n\n', '? ')       |
|   - Provenance Metadata: page_number, start_char, end_char              |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                       SEMANTIC VECTOR INDEX                             |
|   - TF-IDF Vectorizer with Sublinear Term Frequency Scaling             |
|   - Matrix shape: (N_chunks, Vocabulary_Size)                           |
+------------------------------------+------------------------------------+
                                     |
                                     |  User Question: "What is the SLA?"
                                     v
+-------------------------------------------------------------------------+
|                         RETRIEVAL & GUARDRAILS                          |
|   1. Query Vectorization: q = vectorizer.transform([query])             |
|   2. Cosine Similarity: sim(q, c_i) = (q · c_i) / (||q|| ||c_i||)       |
|   3. Top-K Ranking: Sort descending by similarity score                |
|   4. Grounding Check: If max_similarity < 0.10 -> REFUSE (Out of Scope) |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  CONTEXT SYNTHESIS & PROVENANCE CITATION                |
|   - Extract answer sentences from top-k chunks                          |
|   - Format verifiable citations: [Page 1, Chunk p1_c0]                  |
|   - Deliver to Interactive UI with Retrieval Inspector Panel            |
+-------------------------------------------------------------------------+
```

---

## 3. Mathematical & Algorithmic Foundations

### 3.1 Term Frequency - Inverse Document Frequency (TF-IDF)
For each term $t$ in document chunk $d$ from corpus $D$:

$$\text{tf}(t, d) = 1 + \ln(f_{t, d}) \quad \text{for } f_{t, d} > 0$$

$$\text{idf}(t, D) = \ln\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$$

$$\text{tfidf}(t, d, D) = \text{tf}(t, d) \times \text{idf}(t, D)$$

Sublinear term frequency dampens the impact of terms that appear repeatedly within a single chunk (preventing keyword stuffing from distorting retrieval).

### 3.2 Cosine Similarity Metric
Retrieval evaluates the cosine of the angle between normalized query vector $\mathbf{q}$ and document chunk vector $\mathbf{d}$:

$$\text{sim}(\mathbf{q}, \mathbf{d}) = \cos(\theta) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\|_2 \|\mathbf{d}\|_2} = \frac{\sum_{j=1}^{V} q_j d_j}{\sqrt{\sum_{j=1}^V q_j^2} \sqrt{\sum_{j=1}^V d_j^2}}$$

- Value ranges from $0.0$ (orthogonal / no shared semantic terms) to $1.0$ (identical direction).
- In our system, queries yielding $\max(\text{sim}) < 0.10$ are classified as **unsupported/out-of-scope**.

---

## 4. Code Implementation Walkthrough

### 4.1 Boundary-Preserving Chunking (`chunker.py`)
```python
while current_pos < text_len:
    end_pos = min(current_pos + self.chunk_size, text_len)
    
    # Preserve semantic boundaries: search backwards for sentence terminator
    if end_pos < text_len:
        for punct in [".\n", ". ", "? ", "! ", "\n\n"]:
            last_punct = text.rfind(punct, current_pos, end_pos)
            if last_punct != -1 and last_punct > current_pos + (self.chunk_size // 2):
                end_pos = last_punct + len(punct)
                break
```
> [!NOTE]
> Arbitrary character slicing splits compound technical terms (e.g. `AES-256-GCM` becomes `AES-` in chunk 1 and `256-GCM` in chunk 2). Checking punctuation before cutting preserves semantic integrity.

### 4.2 Guardrail Decision Gate (`rag_service.py`)
```python
if not is_grounded or not retrieved_chunks:
    return {
        "is_supported": False,
        "answer": "I cannot find sufficient evidence in the uploaded document...",
        "citations": [],
        "retrieval_trace": search_result
    }
```

---

## 5. Guided Experiments for Learners

### Experiment 1: The Impact of Chunk Overlap
1. Upload `wrenchwise_ai_handbook.pdf`. Set `chunk_size = 300` and `chunk_overlap = 0`.
2. Inspect the chunks in Chunk Explorer. Notice sentences cut cleanly at boundaries.
3. Now set `chunk_overlap = 80`. Notice how sentences straddling two chunks appear in both, ensuring queries matching boundary terms still retrieve full context.

### Experiment 2: The Refusal Guardrail Test
1. Ask the system: `"What is the dispatch interval?"`
   - Observe: Grounded answer citing Page 1, similarity score $\approx 0.35 - 0.50$.
2. Ask: `"What is the capital of France?"`
   - Observe: Refusal Guardrail triggered (`is_supported = False`). The system refuses to fabricate an answer because the document does not contain European geography.

### Experiment 3: Top-K Dilution
1. Set `Top-K = 1` vs `Top-K = 5`.
2. Notice how increasing $K$ too high introduces low-scoring chunks (rank 4, 5) with similarity scores below $0.10$, demonstrating the risk of context pollution.

---

## 6. Debugging Challenge

**Symptom**: An encrypted PDF uploaded by a student crashes the application with an uncaught 500 error.

**Fix Exercise**: Look at `PDFExtractor.extract_from_bytes()` in `document-processing/extractor.py`. Note how we check `reader.is_encrypted` and attempt empty password decryption before raising a structured `ValueError("PDF is encrypted and requires a password.")` that FastAPI returns as an HTTP 400 with a helpful user message.

---

## 7. Knowledge Checkpoint

1. What is the fundamental difference between dense embedding retrieval (e.g., Ada/MiniLM) and sparse lexical retrieval (TF-IDF/BM25)?
2. Why is chunk overlap essential in document question answering?
3. What is the mathematical meaning of cosine similarity being equal to zero?
