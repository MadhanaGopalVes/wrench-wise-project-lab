"""
FastAPI Server for AI Customer Support Agent.
"""
import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

# Add sibling directories to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, os.path.join(parent_dir, "agents"))
sys.path.insert(0, os.path.join(parent_dir, "tools"))

from support_agent import SupportAgent
import order_tools
import kb_tools
import ticket_tools

app = FastAPI(
    title="Wrench Wise · AI Customer Support Agent API",
    description="Multi-tool function calling agent with order lookups, knowledge retrieval, ticket creation, and human-in-the-loop approvals",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = SupportAgent()

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Customer inquiry or scenario prompt")

class ApprovalDecisionRequest(BaseModel):
    approval_id: str
    approved: bool

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "AI Customer Support Agent",
        "tools_registered": len(agent.tool_definitions),
        "active_tickets": len(ticket_tools.get_all_tickets()),
        "pending_approvals": len(ticket_tools.get_all_approvals())
    }

@app.get("/api/tools")
def get_tools():
    return agent.tool_definitions

@app.get("/api/orders")
def get_orders():
    return order_tools.load_orders()

@app.get("/api/kb")
def get_kb():
    return kb_tools.load_kb()

@app.get("/api/tickets")
def get_tickets():
    return ticket_tools.get_all_tickets()

@app.get("/api/approvals")
def get_approvals():
    return ticket_tools.get_all_approvals()

@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        return agent.process_message(req.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")

@app.post("/api/approval/decide")
def decide_approval(req: ApprovalDecisionRequest):
    try:
        res = ticket_tools.process_human_approval(req.approval_id, req.approved)
        if "error" in res:
            raise HTTPException(status_code=404, detail=res["error"])
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static frontend
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
