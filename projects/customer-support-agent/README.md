# AI Customer Support Agent (Function Calling & Tools) · Wrench Wise Project Lab

A standalone, fully functional autonomous AI Agent application built with **FastAPI**, function calling schemas, tool execution engine, simulated order fulfillment database, knowledge base policy search, escalated ticketing, and human supervisor approval gates.

Learners interact with the support agent across diverse enterprise scenarios (tracking inquiries, damaged item escalations, auto-approved low-value refunds, high-value refund holds, and policy lookups). The agent dynamically selects tools, executes functions, captures observable step-by-step traces with latency metrics, and holds sensitive actions in a human approval queue.

---

## 1. Directory Structure

```text
projects/customer-support-agent/
├── backend/
│   ├── main.py                     # FastAPI REST API & static server
│   └── requirements.txt
├── agents/
│   └── support_agent.py            # Perceive-decide-act loop, function calling, traces
├── tools/
│   ├── order_tools.py              # Simulated fulfillment DB order search & status
│   ├── kb_tools.py                 # Corporate policy knowledge base retrieval
│   └── ticket_tools.py             # Support ticketing, escalation & human approval
├── data/
│   ├── orders.json                 # 15 realistic customer shipment records
│   └── knowledge_base.json         # Policy articles (returns, refunds, warranties)
├── frontend/
│   ├── index.html                  # Interactive UI with scenarios, chat & trace timeline
│   ├── app.js                      # Controller & human supervisor decision actions
│   └── style.css                   # Modern Wrench Wise tokens
├── tests/
│   └── test_agent_tools.py         # Pytest suite (9 test cases)
└── README.md
```

---

## 2. Quickstart & Execution

### Prerequisites
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `pydantic`, `pytest`

### Step 1: Install Dependencies
```bash
cd projects/customer-support-agent
pip install -r backend/requirements.txt
```

### Step 2: Run Automated Tests
```bash
pytest tests/test_agent_tools.py -v
```
All 9 test cases verify tool parameter schemas, order lookups, policy retrieval, auto-approved refunds ($\le \$50$), human supervisor gates ($> \$50$), supervisor approval execution, and multi-tool scenario workflows.

### Step 3: Launch the Application
```bash
python backend/main.py
```
Open [http://localhost:8003](http://localhost:8003) in your browser.

---

## 3. Tool Function Calling Specifications

The agent is equipped with 4 formal tools:
1. `lookup_order(order_id: str)`: Looks up real-time shipment status, location, carrier, items, and delivery date.
2. `search_knowledge_base(query: str)`: Searches corporate policy on return windows, refund rules, and weather delays.
3. `create_support_ticket(order_id: str, issue_type: str, priority: str, description: str)`: Dispatches high/urgent priority escalation tickets to logistics and product support.
4. `request_refund(order_id: str, amount: float, reason: str)`: Executes auto-approval for $\le \$50$ or creates a pending human supervisor review item for $> \$50$.
