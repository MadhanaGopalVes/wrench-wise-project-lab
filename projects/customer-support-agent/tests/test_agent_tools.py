"""
Automated Pytest Suite for AI Customer Support Agent.
Run with: pytest projects/customer-support-agent/tests/test_agent_tools.py -v
"""
import pytest
import os
import sys

# Add agent and tools to path
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(base_dir, "agents"))
sys.path.insert(0, os.path.join(base_dir, "tools"))

from support_agent import SupportAgent
import order_tools
import kb_tools
import ticket_tools

@pytest.fixture(scope="module")
def agent():
    return SupportAgent()

def test_tool_definitions_schema(agent):
    tools = agent.tool_definitions
    assert len(tools) == 4
    tool_names = [t["name"] for t in tools]
    assert "lookup_order" in tool_names
    assert "search_knowledge_base" in tool_names
    assert "create_support_ticket" in tool_names
    assert "request_refund" in tool_names

def test_order_lookup_success():
    res = order_tools.lookup_order("ORD-9011")
    assert res["found"] is True
    assert res["customer_name"] == "Sarah Connor"
    assert res["status"] == "in_transit"
    assert res["carrier"] == "FedEx"
    assert "tracking_number" in res

def test_order_lookup_not_found():
    res = order_tools.lookup_order("ORD-0000")
    assert res["found"] is False
    assert "error" in res

def test_kb_policy_search():
    res = kb_tools.search_knowledge_base("return window and packaging")
    assert res["results_found"] > 0
    top = res["articles"][0]
    assert "30" in top["content"]
    assert top["topic"] == "return_policy"

def test_refund_under_threshold_auto_approved():
    res = ticket_tools.request_refund(order_id="ORD-5501", amount=35.0, reason="Small delay")
    assert res["status"] == "AUTOMATICALLY_APPROVED"
    assert res["requires_human"] is False

def test_refund_over_threshold_requires_human_approval():
    res = ticket_tools.request_refund(order_id="ORD-8422", amount=499.0, reason="Damaged monitor")
    assert res["status"] == "PENDING_HUMAN_APPROVAL"
    assert res["requires_human"] is True
    approval_id = res["approval_id"]

    # Test human supervisor approval action
    decision = ticket_tools.process_human_approval(approval_id, approved=True)
    assert decision["decision"] == "APPROVED"
    assert decision["amount"] == 499.0

def test_agent_order_inquiry_scenario(agent):
    # Customer asks about an order
    res = agent.process_message("Where is my order ORD-9011?")
    assert res["tools_called_count"] >= 1
    assert any(t["tool"] == "lookup_order" for t in res["execution_traces"])
    assert "Sarah Connor" in res["response"]
    assert "FedEx" in res["response"]

def test_agent_damaged_goods_escalation_scenario(agent):
    # Customer reports damaged item
    res = agent.process_message("My package arrived with a cracked screen for order ORD-8422! This is urgent!")
    assert res["tools_called_count"] >= 2
    tools_called = [t["tool"] for t in res["execution_traces"]]
    assert "lookup_order" in tools_called
    assert "create_support_ticket" in tools_called
    assert "ticket" in res["response"].lower()

def test_agent_high_value_refund_scenario(agent):
    # Customer asks for expensive refund
    res = agent.process_message("I demand a refund of $289.00 for order ORD-7731 because it was delayed!")
    assert res["requires_human_approval"] is True
    assert res["approval_id"] is not None
    assert "Supervisor Approval Required" in res["response"]
