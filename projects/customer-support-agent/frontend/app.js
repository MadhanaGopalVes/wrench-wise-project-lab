// AI Customer Support Agent Frontend Logic
const API_BASE = window.location.origin;

// DOM Elements
const backendStatus = document.getElementById('backendStatus');
const statusText = document.getElementById('statusText');
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const traceTimeline = document.getElementById('traceTimeline');
const approvalsContainer = document.getElementById('approvalsContainer');
const ordersPreview = document.getElementById('ordersPreview');

// 1. Healthcheck & Initial State
async function init() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("Agent backend offline");
    const data = await res.json();

    backendStatus.querySelector('.status-dot').style.background = '#10B981';
    statusText.textContent = `FastAPI Agent Online (${data.tools_registered} Tools Loaded)`;

    loadOrders();
    loadApprovals();
  } catch (err) {
    backendStatus.querySelector('.status-dot').style.background = '#EF4444';
    statusText.textContent = `Backend Offline: Run python main.py on port 8003`;
  }
}

// 2. Load Simulated DB Preview
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const orders = await res.json();
    let html = '<table style="width:100%; border-collapse:collapse;">';
    orders.forEach(o => {
      html += `
        <tr style="border-bottom:1px solid #E2E8F0; padding:4px 0;">
          <td><strong style="color:var(--primary);">${o.order_id}</strong></td>
          <td>${o.customer_name}</td>
          <td><span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:#F1F5F9;">${o.status}</span></td>
          <td>$${o.total_amount}</td>
        </tr>
      `;
    });
    html += '</table>';
    ordersPreview.innerHTML = html;
  } catch (err) {
    ordersPreview.innerHTML = '<span style="color:var(--muted);">Failed to load orders.</span>';
  }
}

// 3. Load Pending Approvals
async function loadApprovals() {
  try {
    const res = await fetch(`${API_BASE}/api/approvals`);
    const approvals = await res.json();
    const pendingList = Object.values(approvals).filter(a => a.status === 'PENDING_SUPERVISOR_APPROVAL');

    if (pendingList.length === 0) {
      approvalsContainer.innerHTML = `
        <div style="text-align: center; color: var(--muted); padding: 1rem; font-size: 0.85rem;">
          No pending approval requests. Trigger a high-value refund to test.
        </div>
      `;
      return;
    }

    approvalsContainer.innerHTML = '';
    pendingList.forEach(a => {
      const card = document.createElement('div');
      card.className = 'approval-card';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.85rem; margin-bottom:0.25rem;">
          <span>Request <code>${a.approval_id}</code></span>
          <span style="color:#B45309;">$${a.amount.toFixed(2)} USD</span>
        </div>
        <div class="approval-meta">
          Order: <strong>${a.order_id}</strong> · Reason: "${a.reason}"
        </div>
        <div class="approval-actions">
          <button class="btn-sm btn-approve" data-id="${a.approval_id}" data-action="approve">Approve ($)</button>
          <button class="btn-sm btn-reject" data-id="${a.approval_id}" data-action="reject">Reject</button>
        </div>
      `;
      approvalsContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading approvals:", err);
  }
}

// Supervisor decision listener
approvalsContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const approvalId = btn.dataset.id;
  const isApproved = btn.dataset.action === 'approve';

  try {
    const res = await fetch(`${API_BASE}/api/approval/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_id: approvalId, approved: isApproved })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Decision failed");

    appendMessage('assistant', `🛡️ <strong>Supervisor Action Completed:</strong> ${data.message}`);
    loadApprovals();
  } catch (err) {
    alert("Approval error: " + err.message);
  }
});

// 4. Scenario Selector
document.querySelectorAll('.scenario-card').forEach(card => {
  card.addEventListener('click', () => {
    chatInput.value = card.dataset.prompt;
    handleSendMessage();
  });
});

// 5. Chat & Execution
sendBtn.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSendMessage();
});

async function handleSendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  appendMessage('user', escapeHtml(text));

  chatInput.disabled = true;
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Execution failed");

    // Render agent answer
    appendMessage('assistant', data.response);

    // Render Execution Trace Timeline
    renderTraces(data.execution_traces);

    // Refresh pending approvals in case of high-value refund request
    loadApprovals();

  } catch (err) {
    appendMessage('assistant', `❌ Error: ${err.message}`);
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

function appendMessage(sender, htmlContent) {
  const msg = document.createElement('div');
  msg.className = `message ${sender}`;
  msg.innerHTML = `<div class="message-bubble">${htmlContent}</div>`;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderTraces(traces) {
  if (!traces || traces.length === 0) {
    traceTimeline.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--muted);">No external tools required for this query.</div>';
    return;
  }

  traceTimeline.innerHTML = '';
  traces.forEach(t => {
    const item = document.createElement('div');
    item.className = 'trace-item';
    item.innerHTML = `
      <div class="trace-header">
        <span class="tool-badge">Step #${t.step}: ${t.tool}()</span>
        <span class="latency-badge">⚡ ${t.latency_ms} ms · Status: <strong>${t.status}</strong></span>
      </div>
      <div style="font-size:0.75rem; color:var(--muted); margin-top:0.25rem;">Tool Arguments:</div>
      <pre class="trace-json">${escapeHtml(JSON.stringify(t.input, null, 2))}</pre>
      <div style="font-size:0.75rem; color:var(--muted); margin-top:0.35rem;">Tool Output Result:</div>
      <pre class="trace-json" style="color:#A7F3D0;">${escapeHtml(JSON.stringify(t.output, null, 2))}</pre>
    `;
    traceTimeline.appendChild(item);
  });
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

init();
