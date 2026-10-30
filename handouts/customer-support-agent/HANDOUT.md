# Wrench Wise Project Lab · Technical Handout
## Project 03: AI Customer Support Agent (Function Calling & Tools)

---

## 1. Project Objective & Industry Context

### 1.1 Objective
Construct and evaluate an enterprise **Agentic AI System** that moves beyond passive text completion to active problem resolution. The agent autonomously perceives customer inquiries, dynamically selects and invokes typed function tools against a simulated fulfillment database, searches corporate knowledge articles, generates prioritized escalation tickets, and enforces strict **Human-in-the-Loop (HITL)** governance over sensitive financial refund thresholds.

### 1.2 Industry Problem
Static chatbots that reply with canned, generic responses create customer frustration and fail to solve operational problems. Conversely, completely unconstrained autonomous agents risk:
- **Unauthorized Actions**: An agent refunding hundreds of dollars without human oversight.
- **Hallucinated State**: Fabricating nonexistent order delivery dates rather than querying the real courier tracking system.
- **Opacity / Black-box Behavior**: Support teams having no visibility into which tools were invoked or why an escalation decision occurred.

Agentic architectures with structured tool calling and guardrail gates directly address these vulnerabilities.

---

## 2. System Architecture

```text
+--------------------------------------------------------------------------+
|                         STUDENT INTERACTIVE CLIENT                       |
|   - Scenario Presets (Tracking, Escalation, Auto-Refund, Human Hold, KB) |
|   - Real-Time Chat Conversation Window                                   |
|   - Observable Step-by-Step Tool Trace Timeline with Latencies           |
|   - Human Supervisor Approval Queue with [Approve] / [Reject] Buttons    |
+------------------------------------+-------------------------------------+
                                     |
                                     | HTTP POST /api/chat (JSON)
                                     v
+--------------------------------------------------------------------------+
|                        AGENT PERCEPTION & ROUTING                        |
|                                                                          |
|  1. Perceive: Extract entity tokens (Order ID 'ORD-XXXX', $ amounts)     |
|  2. Tool Schemas: 4 JSON Schema function declarations                    |
|  3. Decision Gate: Multi-tool orchestration                              |
+------------------------------------+-------------------------------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
               v                     v                     v
+-----------------------+ +---------------------+ +-----------------------+
|   ORDER FULFILLMENT   | |    POLICY ENGINE    | |  TICKETING & APPROVAL |
|                       | |                     | |                       |
| lookup_order()        | | search_knowledge()  | | create_ticket()       |
| -> Orders DB (JSON)   | | -> KB Articles      | | request_refund()      |
| -> Courier & Tracking | | -> Return & Refund  | |  |                    |
| -> Estimated ETA      | |    Window Rules     | |  +-- <= $50: AUTO-OK  |
|                       | |                     | |  +-- > $50:  HUMAN    |
|                       | |                     | |       SUPERVISOR GATE |
+-----------------------+ +---------------------+ +-----------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                       SYNTHESIS & OBSERVABILITY TRACE                    |
|   - Formulates context-grounded customer response                        |
|   - Logs exact JSON inputs, execution latency (ms), and output payloads  |
|   - Delivers structured trace to UI inspector                            |
+--------------------------------------------------------------------------+
```

---

## 3. Core Technical Fundamentals

### 3.1 The Perceive-Decide-Act Agent Loop
Unlike static sequential pipelines, an agent operates as a stateful loop:
1. **Perceive**: Read user prompt and inspect conversational history.
2. **Decide / Reason**: Determine if the goal requires external data or actions.
3. **Act**: Emit a structured tool invocation request containing target tool name and typed JSON arguments.
4. **Observe**: Ingest the returned tool output into context.
5. **Repeat or Terminate**: If information is sufficient, synthesize final response; otherwise invoke subsequent tools (e.g. `lookup_order` followed by `create_support_ticket`).

### 3.2 Tool Schemas & Function Calling
Tools are formally registered as JSON schemas with typed properties and mandatory fields:

```python
{
    "name": "request_refund",
    "description": "Submit a refund request for an order. Amounts <= $50 auto-approved; > $50 require human approval.",
    "parameters": {
        "type": "object",
        "properties": {
            "order_id": {"type": "string"},
            "amount": {"type": "number"},
            "reason": {"type": "string"}
        },
        "required": ["order_id", "amount", "reason"]
    }
}
```

### 3.3 Human-in-the-Loop (HITL) Governance
Autonomous systems operating with real company capital must enforce deterministic permission tiers:
- **Low-Risk Actions** (Lookup tracking, checking policy, issuing courtesy store credits $\le \$50$): Autonomous execution.
- **High-Risk Actions** (Refunding $500, modifying delivery addresses, canceling active orders in transit): Suspended in a `PENDING_SUPERVISOR_APPROVAL` state until a human supervisor submits authorization.

---

## 4. Code Implementation Walkthrough

### 4.1 Enforcing the $50 Financial Guardrail (`ticket_tools.py`)
```python
def request_refund(order_id: str, amount: float, reason: str) -> Dict[str, Any]:
    req_id = f"APR-{str(uuid.uuid4())[:6].upper()}"

    if amount <= 50.0:
        return {
            "status": "AUTOMATICALLY_APPROVED",
            "approval_id": req_id,
            "requires_human": False,
            "message": f"Refund of ${amount:.2f} auto-approved (under $50 threshold)."
        }
    else:
        PENDING_APPROVALS[req_id] = {
            "approval_id": req_id,
            "order_id": order_id,
            "amount": amount,
            "status": "PENDING_SUPERVISOR_APPROVAL"
        }
        return {
            "status": "PENDING_HUMAN_APPROVAL",
            "approval_id": req_id,
            "requires_human": True,
            "message": f"Refund request of ${amount:.2f} exceeds agent authority ($50.00). Held for Supervisor Approval."
        }
```

### 4.2 Observable Execution Logging (`support_agent.py`)
```python
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
```

---

## 5. Guided Experiments for Learners

### Experiment 1: Single-Step Tool Execution
1. In the chat, type: `"Where is my order ORD-9011?"`
2. Inspect the **Execution Trace Timeline**:
   - Notice that Step #1 is `lookup_order` with input `{"order_id": "ORD-9011"}`.
   - Observe the returned courier (`FedEx`), tracking number (`FDX-88291039`), and latency ($\approx 1 - 3$ ms).

### Experiment 2: Multi-Step Chained Escalation
1. Type: `"My 34-inch gaming monitor for order ORD-8422 arrived completely cracked and damaged! Please help!"`
2. Inspect the **Execution Trace Timeline**:
   - Step #1: `lookup_order` verifies order ORD-8422 belongs to Marcus Vance and was delivered 3 days ago.
   - Step #2: `create_support_ticket` creates an escalated ticket with priority `HIGH/URGENT` routed to Tier-2 Product Support.
   - Notice how the agent synthesizes both tool outputs into a coherent, empathetic resolution.

### Experiment 3: Testing the Financial Approval Boundary
1. Test Low Value: `"I would like a refund of $45 for order ORD-5501."`
   - Notice: Auto-approved. No item enters the supervisor queue.
2. Test High Value: `"I demand a refund of $289.00 for order ORD-7731."`
   - Notice: The agent indicates supervisor approval is required.
   - Look at the **Human Supervisor Approval Queue** on the left: Card `APR-XXXX` appears!
   - Click **Approve ($)** and watch the human authorization execute live.

---

## 6. Debugging Challenge

**Symptom**: If a customer provides an order ID in lowercase (e.g. `ord-9011`), the database lookup previously returned `NOT_FOUND` because dictionary keys were uppercase.

**Fix Exercise**: Inspect `lookup_order()` in `order_tools.py`. Observe how `order_id.strip().upper()` normalizes incoming tokens before querying the database, preventing case-sensitivity bugs.

---

## 7. Knowledge Checkpoint

1. What prevents an LLM function calling loop from falling into an infinite loop when a tool returns an error?
2. Why is client-side enforcement of approval thresholds insecure compared to server-side guardrails?
3. How does logging latency per tool call help identify performance bottlenecks in multi-agent microservice architectures?
