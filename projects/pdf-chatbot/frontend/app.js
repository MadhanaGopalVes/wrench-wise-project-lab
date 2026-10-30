// PDF Chatbot (RAG) Frontend Logic
const API_BASE = window.location.origin;

let isReady = false;

// DOM Elements
const backendStatus = document.getElementById('backendStatus');
const statusText = document.getElementById('statusText');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const docMetadataBox = document.getElementById('docMetadataBox');
const docTitle = document.getElementById('docTitle');
const docPages = document.getElementById('docPages');
const docWords = document.getElementById('docWords');
const docChunks = document.getElementById('docChunks');

const chunkSizeRange = document.getElementById('chunkSizeRange');
const chunkSizeLabel = document.getElementById('chunkSizeLabel');
const overlapRange = document.getElementById('overlapRange');
const overlapLabel = document.getElementById('overlapLabel');
const topKRange = document.getElementById('topKRange');
const topKLabel = document.getElementById('topKLabel');

const chunksContainer = document.getElementById('chunksContainer');
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const inspectorContainer = document.getElementById('inspectorContainer');
const quickPrompts = document.getElementById('quickPrompts');

// 1. Healthcheck
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("Backend offline");
    const data = await res.json();
    backendStatus.querySelector('.status-dot').style.background = '#10B981';
    statusText.textContent = `FastAPI RAG Connected (${data.chunks_indexed} chunks indexed)`;

    if (data.document_loaded) {
      enableChat();
      fetchChunks();
    }
  } catch (err) {
    backendStatus.querySelector('.status-dot').style.background = '#EF4444';
    statusText.textContent = `Backend Offline: Run python main.py on port 8002`;
  }
}

// Sliders listeners
chunkSizeRange.addEventListener('input', (e) => chunkSizeLabel.textContent = e.target.value);
overlapRange.addEventListener('input', (e) => overlapLabel.textContent = e.target.value);
topKRange.addEventListener('input', (e) => topKLabel.textContent = e.target.value);

// 2. Upload Handling
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    uploadFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    uploadFile(fileInput.files[0]);
  }
});

async function uploadFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert("Please select a valid .pdf file.");
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('chunk_size', chunkSizeRange.value);
  formData.append('chunk_overlap', overlapRange.value);

  dropzone.innerHTML = `
    <div class="dropzone-icon">⏳</div>
    <div style="font-weight: 600;">Extracting text & building vector index...</div>
    <div style="font-size: 0.8rem; color: var(--muted);">${file.name}</div>
  `;

  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");

    displayMetadata(data.document, data.total_chunks);
    displayChunks(data.sample_chunks, data.total_chunks);
    enableChat();

    dropzone.innerHTML = `
      <div class="dropzone-icon">✅</div>
      <div style="font-weight: 600; color: #166534;">Document Indexed Successfully</div>
      <div style="font-size: 0.78rem; color: var(--muted);">Click to upload another PDF</div>
    `;

    appendMessage('assistant', `Loaded document <strong>${data.document.title}</strong> (${data.document.total_pages} pages, ${data.total_chunks} vector chunks). Ask me anything about it!`);

  } catch (err) {
    alert("Error uploading PDF: " + err.message);
    dropzone.innerHTML = `
      <div class="dropzone-icon">❌</div>
      <div style="font-weight: 600; color: #991B1B;">Upload failed</div>
      <div style="font-size: 0.78rem; color: var(--muted);">Click to retry</div>
    `;
  }
}

// 3. Load Sample PDF
loadSampleBtn.addEventListener('click', async () => {
  loadSampleBtn.disabled = true;
  loadSampleBtn.textContent = '⏳ Loading Sample Manual...';
  try {
    // In our backend directory structure, the sample pdf is located in ../sample-documents/
    // Let's create a fetch or create a simple blob
    const sampleRes = await fetch('../sample-documents/wrenchwise_ai_handbook.pdf');
    if (!sampleRes.ok) {
      throw new Error("Sample file not found at static location, upload manually.");
    }
    const blob = await sampleRes.blob();
    const file = new File([blob], 'wrenchwise_ai_handbook.pdf', { type: 'application/pdf' });
    await uploadFile(file);
  } catch (err) {
    // If static fetch fails, trigger upload prompt
    fileInput.click();
  } finally {
    loadSampleBtn.disabled = false;
    loadSampleBtn.innerHTML = `<span>📑</span> Load Sample Delivery Platform Manual`;
  }
});

function displayMetadata(meta, totalChunks) {
  docMetadataBox.style.display = 'block';
  docTitle.textContent = meta.title || "Uploaded Document";
  docPages.textContent = `Pages: ${meta.total_pages}`;
  docWords.textContent = `Words: ${meta.total_words.toLocaleString()}`;
  docChunks.textContent = `Chunks: ${totalChunks}`;
}

async function fetchChunks() {
  try {
    const res = await fetch(`${API_BASE}/api/chunks`);
    const data = await res.json();
    displayChunks(data.chunks, data.total_chunks);
  } catch (err) {
    console.error(err);
  }
}

function displayChunks(chunks, total) {
  chunksContainer.innerHTML = '';
  if (!chunks || chunks.length === 0) {
    chunksContainer.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--muted);">No chunks available.</div>';
    return;
  }

  chunks.forEach(c => {
    const card = document.createElement('div');
    card.className = 'chunk-card';
    card.innerHTML = `
      <div class="chunk-header">
        <span>Chunk <code>${c.chunk_id}</code></span>
        <span>Page ${c.page_number} (${c.character_count} chars)</span>
      </div>
      <div style="color: var(--slate);">${escapeHtml(c.content)}</div>
    `;
    chunksContainer.appendChild(card);
  });
}

function enableChat() {
  chatInput.disabled = false;
  sendBtn.disabled = false;
  chatInput.placeholder = "Ask a question about the document...";
  isReady = true;
}

// 4. Chat & Retrieval
sendBtn.addEventListener('click', handleUserQuery);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleUserQuery();
});

// Quick prompts
quickPrompts.addEventListener('click', (e) => {
  const chip = e.target.closest('.prompt-chip');
  if (chip && isReady) {
    chatInput.value = chip.dataset.q;
    handleUserQuery();
  }
});

async function handleUserQuery() {
  const query = chatInput.value.trim();
  if (!query) return;

  chatInput.value = '';
  appendMessage('user', escapeHtml(query));

  chatInput.disabled = true;
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        top_k: parseInt(topKRange.value)
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Query failed");

    // Render Answer with citations
    let citationsHtml = '';
    if (data.citations && data.citations.length > 0) {
      citationsHtml = '<div style="margin-top: 0.6rem;">';
      data.citations.forEach(c => {
        citationsHtml += `<span class="citation-pill">📄 Page ${c.page_number} (Sim: ${c.similarity_score.toFixed(3)})</span>`;
      });
      citationsHtml += '</div>';
    }

    let refusalBadge = '';
    if (!data.is_supported) {
      refusalBadge = `<div class="refusal-pill">⚠️ Refusal Guardrail Triggered (Out of Scope)</div><br>`;
    }

    appendMessage('assistant', `${refusalBadge}${data.answer}${citationsHtml}`);

    // Render Retrieval Inspector
    renderInspector(data.retrieval_trace);

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

function renderInspector(trace) {
  if (!trace || !trace.retrieved_chunks) return;

  inspectorContainer.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; font-size:0.8rem; color:var(--muted);">
      <span>Query: "<strong>${escapeHtml(trace.query)}</strong>"</span>
      <span>Threshold: <code>${trace.threshold}</code> · Max Similarity: <code>${trace.max_similarity.toFixed(4)}</code></span>
    </div>
  `;

  trace.retrieved_chunks.forEach(c => {
    const isAbove = c.is_above_threshold;
    const card = document.createElement('div');
    card.className = 'inspector-card';
    card.style.borderLeftColor = isAbove ? '#10B981' : '#F59E0B';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <span style="font-weight:700; font-size:0.85rem;">Rank #${c.rank} · Chunk <code>${c.chunk_id}</code></span>
        <div>
          <span class="score-badge" style="background:${isAbove ? '#DCFCE7' : '#FEF3C7'}; color:${isAbove ? '#166534' : '#92400E'};">
            Cosine Sim: ${c.similarity_score.toFixed(4)}
          </span>
          <span style="font-size:0.75rem; margin-left:6px; color:var(--muted);">Page ${c.page_number}</span>
        </div>
      </div>
      <div style="font-size:0.82rem; color:var(--slate); font-style:italic;">
        "${escapeHtml(c.content)}"
      </div>
    `;
    inspectorContainer.appendChild(card);
  });
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Initial healthcheck
checkHealth();
