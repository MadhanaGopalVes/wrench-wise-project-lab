"""
Support Ticket, Escalation, and Human Approval Tools.
"""
import uuid
import time
from typing import Dict, Any, List, Optional

# In-memory storage for active tickets and pending approvals
SUPPORT_TICKETS: List[Dict[str, Any]] = []
PENDING_APPROVALS: Dict[str, Dict[str, Any]] = {}

def create_support_ticket(
    order_id: str,
    issue_type: str,
    priority: str,
    description: str
) -> Dict[str, Any]:
    """
    Create a new support ticket and route it to the appropriate team (tier-1, tier-2, logistics, or returns).
    """
    ticket_id = f"TCK-{str(uuid.uuid4())[:6].upper()}"
    ticket = {
        "ticket_id": ticket_id,
        "order_id": order_id,
        "issue_type": issue_type,
        "priority": priority.upper(),
        "description": description,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": "OPEN",
        "assigned_team": "Logistics Rapid Response" if "delay" in issue_type.lower() else "Tier-2 Product Support"
    }
    SUPPORT_TICKETS.append(ticket)
    return {
        "success": True,
        "ticket": ticket,
        "message": f"Support ticket {ticket_id} created successfully with {ticket['priority']} priority."
    }

def request_refund(
    order_id: str,
    amount: float,
    reason: str
) -> Dict[str, Any]:
    """
    Initiate a refund. Enforces corporate compliance:
    - Amounts <= $50.00: Automatically approved.
    - Amounts > $50.00: Held in human supervisor approval queue.
    """
    req_id = f"APR-{str(uuid.uuid4())[:6].upper()}"

    if amount <= 50.0:
        return {
            "status": "AUTOMATICALLY_APPROVED",
            "approval_id": req_id,
            "order_id": order_id,
            "amount": amount,
            "reason": reason,
            "requires_human": False,
            "message": f"Refund of ${amount:.2f} for order {order_id} has been automatically approved and queued for processing (under $50 auto-threshold)."
        }
    else:
        record = {
            "approval_id": req_id,
            "order_id": order_id,
            "amount": amount,
            "reason": reason,
            "requires_human": True,
            "status": "PENDING_SUPERVISOR_APPROVAL",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        PENDING_APPROVALS[req_id] = record
        return {
            "status": "PENDING_HUMAN_APPROVAL",
            "approval_id": req_id,
            "order_id": order_id,
            "amount": amount,
            "reason": reason,
            "requires_human": True,
            "message": f"Refund request of ${amount:.2f} exceeds automated agent authority ($50.00). It has been placed in the Human Supervisor Approval Queue under ID {req_id}."
        }

def process_human_approval(approval_id: str, approved: bool) -> Dict[str, Any]:
    """
    Process supervisor decision on pending high-value refund.
    """
    if approval_id not in PENDING_APPROVALS:
        return {"error": f"No pending approval request found with ID {approval_id}"}

    record = PENDING_APPROVALS[approval_id]
    record["status"] = "APPROVED" if approved else "REJECTED"
    record["decided_at"] = time.strftime("%Y-%m-%d %H:%M:%S")

    return {
        "approval_id": approval_id,
        "order_id": record["order_id"],
        "amount": record["amount"],
        "decision": record["status"],
        "message": f"Refund of ${record['amount']:.2f} was {record['status'].lower()} by human supervisor."
    }

def get_all_tickets() -> List[Dict[str, Any]]:
    return SUPPORT_TICKETS

def get_all_approvals() -> Dict[str, Dict[str, Any]]:
    return PENDING_APPROVALS
