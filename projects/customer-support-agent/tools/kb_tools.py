"""
Knowledge Base Tools for AI Customer Support Agent.
"""
import json
import os
import re
from typing import Dict, Any, List

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge_base.json")

def load_kb() -> List[Dict[str, Any]]:
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def search_knowledge_base(query: str) -> Dict[str, Any]:
    """
    Search corporate policy guidelines (returns, refunds, damage claims, shipping delay compensation).
    """
    kb = load_kb()
    query_tokens = set(re.findall(r'\w+', query.lower()))

    results = []
    for article in kb:
        text = f"{article['topic']} {article['title']} {article['content']}".lower()
        score = sum(1 for token in query_tokens if token in text)
        if score > 0:
            results.append({
                "id": article["id"],
                "topic": article["topic"],
                "title": article["title"],
                "content": article["content"],
                "relevance_score": score
            })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)

    return {
        "query": query,
        "results_found": len(results),
        "articles": results[:2]
    }
