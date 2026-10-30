"""
Text Chunking Engine for Retrieval-Augmented Generation (RAG).
Implements sliding-window chunking with configurable overlap, sentence-boundary preservation, and page provenance.
"""
from typing import List, Dict, Any

class DocumentChunker:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 100):
        """
        :param chunk_size: Target character length per chunk (e.g. 500 chars ~ 80-100 words).
        :param chunk_overlap: Number of characters to overlap between adjacent chunks.
        """
        if chunk_overlap >= chunk_size:
            raise ValueError(f"chunk_overlap ({chunk_overlap}) must be strictly less than chunk_size ({chunk_size})")
        
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_pages(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chunk a list of extracted page dictionaries. Preserves page attribution for every chunk.
        """
        chunks: List[Dict[str, Any]] = []
        global_chunk_idx = 0

        for page in pages:
            page_num = page["page_number"]
            text = page["text"]

            if not text.strip():
                continue

            page_chunks = self._chunk_text(text, page_num, global_chunk_idx)
            chunks.extend(page_chunks)
            global_chunk_idx += len(page_chunks)

        return chunks

    def _chunk_text(self, text: str, page_num: int, start_idx: int) -> List[Dict[str, Any]]:
        chunks = []
        text_len = len(text)
        step = self.chunk_size - self.chunk_overlap
        current_pos = 0
        local_idx = 0

        while current_pos < text_len:
            end_pos = min(current_pos + self.chunk_size, text_len)
            
            # If not at the very end of text, attempt to find a clean punctuation/newline boundary
            if end_pos < text_len:
                candidate_cut = -1
                for punct in ["\n\n", ".\n", ". ", "? ", "! ", "\n"]:
                    last_punct = text.rfind(punct, current_pos, end_pos)
                    if last_punct != -1 and last_punct > current_pos + (self.chunk_size // 2):
                        candidate_cut = last_punct + len(punct)
                        break
                if candidate_cut != -1:
                    end_pos = candidate_cut

            chunk_content = text[current_pos:end_pos].strip()

            if chunk_content:
                chunks.append({
                    "chunk_id": f"p{page_num}_c{start_idx + local_idx}",
                    "index": start_idx + local_idx,
                    "page_number": page_num,
                    "start_char": current_pos,
                    "end_char": end_pos,
                    "character_count": len(chunk_content),
                    "word_count": len(chunk_content.split()),
                    "content": chunk_content
                })
                local_idx += 1

            if end_pos >= text_len:
                break

            current_pos += step
            # If step didn't advance past previous pos, force advance to prevent infinite loop
            if current_pos <= current_pos - step:
                current_pos += self.chunk_size

        return chunks
