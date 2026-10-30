"""
PDF Document Extractor using pypdf.
Extracts raw text, page metadata, character counts, and handles corrupted or password-protected files.
"""
import io
from typing import Dict, Any, List
import pypdf

class PDFExtractor:
    @staticmethod
    def extract_from_bytes(file_bytes: bytes, filename: str = "document.pdf") -> Dict[str, Any]:
        """
        Extract text from raw PDF bytes.
        Returns extracted pages, text, and metadata.
        """
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {str(e)}")

        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                raise ValueError("PDF is encrypted and requires a password.")

        total_pages = len(reader.pages)
        if total_pages == 0:
            raise ValueError("PDF file is empty (contains 0 pages).")

        pages_data: List[Dict[str, Any]] = []
        full_text_list: List[str] = []

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            page_text = page.extract_text() or ""
            # Clean whitespace while preserving line structure
            cleaned_text = "\n".join(line.strip() for line in page_text.splitlines() if line.strip())
            
            pages_data.append({
                "page_number": page_num,
                "text": cleaned_text,
                "character_count": len(cleaned_text),
                "word_count": len(cleaned_text.split())
            })
            if cleaned_text:
                full_text_list.append(cleaned_text)

        full_text = "\n\n".join(full_text_list)

        if not full_text.strip():
            raise ValueError("No extractable text found in PDF. Document may be scanned images only.")

        meta = reader.metadata or {}
        doc_info = {
            "title": str(meta.get("/Title", "") or filename),
            "author": str(meta.get("/Author", "") or "Unknown"),
            "total_pages": total_pages,
            "total_characters": len(full_text),
            "total_words": len(full_text.split()),
        }

        return {
            "metadata": doc_info,
            "pages": pages_data,
            "full_text": full_text
        }
