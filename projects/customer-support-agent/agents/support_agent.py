"""
AI Customer Support Agent Engine.
Implements the Perceive-Decide-Act agent loop with tool selection, function execution, trace logging, and human approval gates.
"""
import os
import sys
import re
import time
from typing import Dict, Any, List, Optional

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, os.path.join(parent_dir, "tools"))

import order_tools
import kb_tools
import ticket_tools

class SupportAgent:
    def __init__(self):
        self.tool_definitions = self._register_tools()
        self.conversation_history: List[Dict[str, str]] = []

    def _register_tools(self) -> List[Dict[str, Any]]:
        """
        Tool schema definitions adhering to standard function-calling specifications.
        """
        return [
            {
                "name": "lookup_order",
                "description": "Look up shipment tracking, items, delivery ETA, carrier, and status using Order ID.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "string", "description": "The order identifier (e.g., ORD-9011, ORD-8422)"}
                    },
                    "required": ["order_id"]
                }
            },
            {
                "name": "search_knowledge_base",
                "description": "Search corporate support knowledge base for return windows, refund rules, warranty, or delay compensation.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search keywords or topic (e.g., 'refund policy', 'damaged item', 'shipping delay')"}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "create_support_ticket",
                "description": "Create an escalated support ticket for complex issues, damaged packages, or logistics investigations.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "string", "description": "Order ID involved"},
                        "issue_type": {"type": "string", "description": "Category (e.g., 'damaged_goods', 'severe_delay', 'billing_dispute')"},
                        "priority": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"]},
                        "description": {"type": "string", "description": "Summary of customer issue"}
                    },
                    "required": ["order_id", "issue_type", "priority", "description"]
                }
            },
            {
                "name": "request_refund",
                "description": "Submit a refund request for an order. Amounts <= $50 are auto-approved; amounts > $50 require human approval.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "string", "description": "The order ID"},
                        "amount": {"type": "number", "description": "Refund amount requested in USD"},
                        "reason": {"type": "string", "description": "Justification for refund"}
                    },
                    "required": ["order_id", "amount", "reason"]
                }
            }
        ]

    def process_message(self, user_message: str) -> Dict[str, Any]:
        """
        Execute the autonomous agent loop:
        1. Perceive input & extract entities (Order IDs, amounts, intent)
        2. Plan necessary tool calls
        3. Execute tools and capture traces
        4. Synthesize final customer-facing response
        """
        traces: List[Dict[str, Any]] = []
        msg_lower = user_message.lower()

        # Step 1: Entity Extraction
        order_match = re.search(r'ORD-\d{4}', user_message.upper())
        detected_order_id = order_match.group(0) if order_match else None

        amount_match = re.search(r'\$(\d+(?:\.\d{2})?)|\b(\d+(?:\.\d{2})?)\s*(?:dollars|usd)', msg_lower)
        detected_amount = None
        if amount_match:
            detected_amount = float(amount_match.group(1) or amount_match.group(2))

        # Step 2: Autonomous Tool Selection & Execution Loop
        order_info = None
        if detected_order_id:
            t0 = time.time()
            res = order_tools.lookup_order(detected_order_id)
            lat = round((time.time() - t0) * 1000, 2)
            traces.append({
                "step": len(traces) + 1,
                "tool": "lookup_order",
                "input": {"order_id": detected_order_id},
                "output": res,
                "latency_ms": lat,
                "status": "SUCCESS" if res.get("found") else "NOT_FOUND"
            })
            if res.get("found"):
                order_info = res

        # Tool 2: Knowledge Base search if policy query detected
        kb_results = None
        kb_keywords = ["policy", "return", "refund", "warranty", "delay", "rule", "cancel", "compensation"]
        if any(kw in msg_lower for kw in kb_keywords):
            t0 = time.time()
            res = kb_tools.search_knowledge_base(user_message)
            lat = round((time.time() - t0) * 1000, 2)
            traces.append({
                "step": len(traces) + 1,
                "tool": "search_knowledge_base",
                "input": {"query": user_message},
                "output": res,
                "latency_ms": lat,
                "status": "SUCCESS"
            })
            kb_results = res

        # Tool 3: Refund request if customer asks for refund/money back
        refund_result = None
        if "refund" in msg_lower and (detected_amount or order_info):
            refund_amt = detected_amount or (order_info["total_amount"] if order_info else 45.0)
            order_id = detected_order_id or "ORD-GENERAL"
            t0 = time.time()
            res = ticket_tools.request_refund(order_id, refund_amt, reason="Customer initiated via support chat")
            lat = round((time.time() - t0) * 1000, 2)
            traces.append({
                "step": len(traces) + 1,
                "tool": "request_refund",
                "input": {"order_id": order_id, "amount": refund_amt, "reason": "Customer request"},
                "output": res,
                "latency_ms": lat,
                "status": res["status"]
            })
            refund_result = res

        # Tool 4: Support ticket creation if customer complains of damaged goods or severe delays
        ticket_result = None
        if any(term in msg_lower for term in ["damaged", "broken", "cracked", "lost", "stolen", "never arrived", "investigate", "escalate"]):
            order_id = detected_order_id or "ORD-UNKNOWN"
            priority = "URGENT" if any(w in msg_lower for w in ["urgent", "immediately", "expensive", "emergency"]) else "HIGH"
            issue_type = "damaged_goods" if any(w in msg_lower for w in ["damaged", "broken", "cracked"]) else "lost_in_transit"
            t0 = time.time()
            res = ticket_tools.create_support_ticket(order_id, issue_type, priority, user_message)
            lat = round((time.time() - t0) * 1000, 2)
            traces.append({
                "step": len(traces) + 1,
                "tool": "create_support_ticket",
                "input": {"order_id": order_id, "issue_type": issue_type, "priority": priority, "description": user_message},
                "output": res,
                "latency_ms": lat,
                "status": "SUCCESS"
            })
            ticket_result = res

        # Step 3: Synthesis of Context-Grounded Response
        response_text = self._synthesize_agent_response(
            user_message=user_message,
            order_info=order_info,
            kb_results=kb_results,
            refund_result=refund_result,
            ticket_result=ticket_result,
            detected_order_id=detected_order_id
        )

        return {
            "user_message": user_message,
            "response": response_text,
            "tools_called_count": len(traces),
            "execution_traces": traces,
            "requires_human_approval": refund_result.get("requires_human", False) if refund_result else False,
            "approval_id": refund_result.get("approval_id") if (refund_result and refund_result.get("requires_human")) else None
        }

    def _synthesize_agent_response(
        self,
        user_message: str,
        order_info: Optional[Dict[str, Any]],
        kb_results: Optional[Dict[str, Any]],
        refund_result: Optional[Dict[str, Any]],
        ticket_result: Optional[Dict[str, Any]],
        detected_order_id: Optional[str]
    ) -> str:
        paragraphs = []

        # 1. Order Status acknowledgement
        if order_info:
            status_text = f"Hello {order_info['customer_name']}! I located your order <strong>{order_info['order_id']}</strong>. "
            if order_info["status"] == "in_transit":
                status_text += f"It is currently <strong>in transit</strong> with {order_info['carrier']} (Tracking: {order_info['tracking_number']}). Current location: {order_info['current_location']}. Estimated delivery is <strong>{order_info['estimated_delivery']}</strong>."
            elif order_info["status"] == "delivered":
                status_text += f"Our records indicate it was <strong>delivered</strong> by {order_info['carrier']} on {order_info['estimated_delivery']}. {order_info.get('delivery_notes', '')}"
            elif order_info["status"] == "delayed":
                status_text += f"It is currently marked as <strong>delayed</strong> at {order_info['current_location']} due to weather conditions. Carrier: {order_info['carrier']}."
            paragraphs.append(status_text)
        elif detected_order_id:
            paragraphs.append(f"I attempted to look up order <strong>{detected_order_id}</strong> in our fulfillment database, but could not find a matching active order. Please verify your order number.")

        # 2. Knowledge Base facts
        if kb_results and kb_results.get("articles"):
            top_article = kb_results["articles"][0]
            paragraphs.append(f"Regarding our policy on <em>{top_article['title']}</em>: {top_article['content']}")

        # 3. Ticket creation confirmation
        if ticket_result:
            t = ticket_result["ticket"]
            paragraphs.append(f"I have created an escalated priority <strong>{t['priority']}</strong> ticket (<code>{t['ticket_id']}</code>) assigned to <strong>{t['assigned_team']}</strong> for swift resolution.")

        # 4. Refund outcome
        if refund_result:
            if refund_result["requires_human"]:
                paragraphs.append(f"⚠️ <strong>Supervisor Approval Required:</strong> Your refund request for <strong>${refund_result['amount']:.2f}</strong> exceeds automated agent authority. It has been submitted to the Human Supervisor Approval Queue under Reference ID <code>{refund_result['approval_id']}</code>.")
            else:
                paragraphs.append(f"✅ <strong>Refund Approved:</strong> {refund_result['message']}")

        # Fallback if no specific tools were triggered
        if not paragraphs:
            paragraphs.append(
                "Hello! I am your Wrench Wise AI Customer Support Agent. I have real-time access to our order database, policy knowledge base, escalation ticketing, and refund systems. How can I assist you with your order today?"
            )

        return "<br><br>".join(paragraphs)
