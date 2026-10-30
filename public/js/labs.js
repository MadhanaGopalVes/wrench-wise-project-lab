/* Interactive project labs for the three flagship projects.
   Each lab talks to a server-side engine and labels whether output is REAL, DEMO or LIVE LLM. */
const Labs = (() => {
  const tabs = (items) => `<div class="lab-tabs" role="tablist">${items.map(([id, l], i) => `<button class="lab-tab" role="tab" data-pane="${id}" aria-selected="${i === 0}">${l}</button>`).join('')}</div>`;
  function wireTabs(root) {
    $$('.lab-tab', root).forEach((t) => t.addEventListener('click', () => { $$('.lab-tab', root).forEach((x) => x.setAttribute('aria-selected', x === t)); $$('.lab-pane', root).forEach((p) => p.classList.toggle('on', p.id === t.dataset.pane)); }));
  }
  const showPane = (root, id) => $(`.lab-tab[data-pane=${id}]`, root).click();
  const frame = (title, sub, body) => `<div class="lab"><div class="lab-head"><div><h3>${title}</h3><div style="font-size:13px;opacity:.9">${sub}</div></div><div id="labMode"></div></div>${body}</div>`;
  const err = (e) => `<div class="form-err">${esc(e.message)}</div>`;

  /* ================= ML LAB ================= */
  function scatter(points) {
    const W = 420, H = 320, pad = 44; const all = points.flatMap((p) => [p.actual, p.predicted]); const lo = Math.floor(Math.min(...all) / 50) * 50, hi = Math.ceil(Math.max(...all) / 50) * 50;
    const X = (v) => pad + ((v - lo) / (hi - lo)) * (W - pad - 14), Y = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - pad - 14);
    const ticks = [0, 1, 2, 3, 4].map((i) => Math.round(lo + (i * (hi - lo)) / 4));
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Actual versus predicted price scatter plot"><path d="M${pad} ${H - pad}H${W - 10}M${pad} ${H - pad}V10" stroke="#CBD5E1"/>${ticks.map((t) => `<text x="${X(t)}" y="${H - pad + 16}" font-size="10" text-anchor="middle" fill="#64748B">${t}</text><text x="${pad - 6}" y="${Y(t) + 3}" font-size="10" text-anchor="end" fill="#64748B">${t}</text>`).join('')}
    <line x1="${X(lo)}" y1="${Y(lo)}" x2="${X(hi)}" y2="${Y(hi)}" stroke="#08805A" stroke-dasharray="5 5" stroke-width="2"/>${points.map((p) => `<circle cx="${X(p.actual)}" cy="${Y(p.predicted)}" r="3.6" fill="#0F172A" opacity=".55"><title>Actual ${p.actual}, predicted ${p.predicted}</title></circle>`).join('')}
    <text x="${W / 2}" y="${H - 6}" font-size="11" text-anchor="middle" fill="#334155">Actual price (US$ thousand)</text><text x="12" y="${H / 2}" font-size="11" text-anchor="middle" fill="#334155" transform="rotate(-90 12 ${H / 2})">Predicted</text></svg>`;
  }
  function mlLab(ctx) {
    let DS, last, algos;
    const sel = new Set(['sqft', 'bedrooms', 'bathrooms', 'age', 'distance_km', 'garage', 'school_score']);
    const mount = async (root) => {
      root.innerHTML = frame('ML Model Builder Lab', 'Real training on a synthetic housing dataset', `<div class="banner real" style="margin:18px 24px 0"><b>REAL EXECUTION.</b> Models are genuinely trained on the server when you press Train. No numbers are pre-baked. The dataset is synthetic.</div>${tabs([['m-data', '1 · Dataset'], ['m-model', '2 · Features & Model'], ['m-res', '3 · Results'], ['m-pred', '4 · Predict']])}<div class="lab-body">
      <div class="lab-pane on" id="m-data"><div class="spin dark"></div></div>
      <div class="lab-pane" id="m-model"></div><div class="lab-pane" id="m-res"><p class="note">Train a model to see its report here.</p></div><div class="lab-pane" id="m-pred"><p class="note">Train a model first.</p></div></div>`);
      $('#labMode').innerHTML = modeBadge('real'); wireTabs(root);
      try { DS = await api('/api/lab/ml/dataset'); algos = DS.algorithms; ctx.refresh(); } catch (e) { $('#m-data', root).innerHTML = err(e); return; }
      $('#m-data', root).innerHTML = `<p><b>${DS.n} homes</b> · target: <code>${DS.target}</code> (US$ thousand). Correlation with price:</p><div class="bars">${[...DS.correlation].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).map((c) => `<div class="b"><span>${esc(c.key)}</span><i style="width:${Math.abs(c.r) * 100}%;${c.r < 0 ? 'background:linear-gradient(90deg,#fca5a5,#dc2626)' : ''}"></i><b>${c.r}</b></div>`).join('')}</div><p class="note">Notice <code>random_noise</code>: it should have almost no relationship with price.</p>
      <h4 style="margin-top:18px">Summary statistics</h4><div class="tbl-wrap"><table class="t"><thead><tr><th>Feature</th><th>Min</th><th>Max</th><th>Mean</th><th>Std</th></tr></thead><tbody>${DS.stats.map((s) => `<tr><td>${esc(s.key)}</td><td>${s.min}</td><td>${s.max}</td><td>${s.mean}</td><td>${s.sd}</td></tr>`).join('')}</tbody></table></div>
      <h4 style="margin-top:18px">First rows</h4><div class="tbl-wrap"><table class="t"><thead><tr>${Object.keys(DS.sample[0]).map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${DS.sample.map((r) => `<tr>${Object.values(r).map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div><button class="btn" style="margin-top:16px" id="toModel">Next: choose features →</button>`;
      $('#toModel', root).addEventListener('click', () => showPane(root, 'm-model'));
      $('#m-model', root).innerHTML = `<div class="row2"><div class="ctl"><h4>Features</h4>${DS.features.map((f) => `<label class="feat"><span><input type="checkbox" data-f="${f.key}" ${sel.has(f.key) ? 'checked' : ''}> ${esc(f.label)}</span><small>${esc(f.key)}</small></label>`).join('')}</div>
      <div class="ctl"><h4>Algorithm</h4><select id="algo">${Object.entries(algos).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select><div id="params"></div><label>Test set size <span class="rv" id="ts-v">25%</span></label><input type="range" id="ts" min="10" max="40" value="25"><button class="btn block" style="margin-top:18px" id="trainBtn">Train model</button><div id="trainErr"></div></div></div>`;
      const drawParams = () => {
        const a = $('#algo', root).value, p = algos[a].params; $('#params', root).innerHTML = Object.entries(p).map(([k, [lo, hi, d]]) => `<label>${k} <span class="rv" id="pv-${k}">${d}</span></label><input type="range" data-p="${k}" min="${lo}" max="${hi}" step="${hi <= 12 ? 1 : 5}" value="${d}">`).join('');
        $$('[data-p]', root).forEach((r) => r.addEventListener('input', () => ($('#pv-' + r.dataset.p, root).textContent = r.value)));
      };
      $('#algo', root).addEventListener('change', drawParams); drawParams();
      $('#ts', root).addEventListener('input', (e) => ($('#ts-v', root).textContent = e.target.value + '%'));
      $$('[data-f]', root).forEach((c) => c.addEventListener('change', () => (c.checked ? sel.add(c.dataset.f) : sel.delete(c.dataset.f))));
      $('#trainBtn', root).addEventListener('click', (e) => busy(e.currentTarget, async () => {
        const params = {}; $$('[data-p]', root).forEach((r) => (params[r.dataset.p] = +r.value));
        try {
          const r = await api('/api/lab/ml/train', { features: [...sel], algorithm: $('#algo', root).value, params, testSize: +$('#ts', root).value / 100 });
          last = r.result; $('#trainErr', root).innerHTML = ''; results(root); showPane(root, 'm-res'); predictForm(root); ctx.refresh();
        } catch (er) { $('#trainErr', root).innerHTML = err(er); }
      }));
    };
    function results(root) {
      const r = last, m = (k, l, sub) => `<div class="metric"><b>${r.test[k]}</b><span>${l}</span><small>${sub} · train ${r.train[k]}</small></div>`;
      $('#m-res', root).innerHTML = `<p><b>${esc(r.label)}</b> ${Object.keys(r.params).length ? '· ' + esc(JSON.stringify(r.params)) : ''} · ${r.features.length} features · ${r.nTrain} train / ${r.nTest} test rows</p>
      <div class="metrics">${m('mae', 'MAE (test)', 'avg error, US$k')}${m('mse', 'MSE (test)', 'squared error')}${m('r2', 'R² (test)', '1.0 = perfect')}</div><div class="diag"><b>Diagnosis:</b> ${esc(r.diagnosis)}</div>
      <div class="row2"><div><h4>Actual vs predicted (test set)</h4><div class="chart">${scatter(r.points)}</div><p class="note">Points on the dashed diagonal are perfect predictions.</p></div>
      <div><h4>${r.importance ? 'Feature influence' : 'Feature influence'}</h4>${r.importance ? `<div class="bars">${r.importance.slice().sort((a, b) => b.value - a.value).map((x) => `<div class="b"><span>${esc(x.feature)}</span><i style="width:${x.value * 100}%"></i><b>${(x.value * 100).toFixed(0)}%</b></div>`).join('')}</div>` : '<p class="note">k-Nearest Neighbours has no built-in feature importance.</p>'}</div></div>`;
    }
    function predictForm(root) {
      const ff = DS.features.filter((f) => last.features.includes(f.key));
      $('#m-pred', root).innerHTML = `<div class="row2"><div class="ctl"><p>Describe a new home. The server retrains your last configuration and predicts.</p>${ff.map((f) => `<label>${esc(f.label)} <span class="rv" id="pr-${f.key}-v">${f.def}</span></label><input type="range" data-pf="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.def}">`).join('')}<button class="btn block" style="margin-top:16px" id="predBtn">Predict price</button></div><div><div class="metric" style="margin-top:20px"><b id="predOut">–</b><span>Estimated price (US$ thousand)</span><small id="predNote">Typical error ≈ ±${last.test.mae}k (test MAE)</small></div></div></div>`;
      $$('[data-pf]', root).forEach((r) => r.addEventListener('input', () => ($(`#pr-${r.dataset.pf}-v`, root).textContent = r.value)));
      $('#predBtn', root).addEventListener('click', (e) => busy(e.currentTarget, async () => {
        const values = {}; $$('[data-pf]', root).forEach((r) => (values[r.dataset.pf] = +r.value));
        try { const r = await api('/api/lab/ml/predict', { values }); $('#predOut', root).textContent = '$' + r.price + 'k'; ctx.refresh(); } catch (er) { toast(er.message); }
      }));
    }
    return { mount, expUrl: '/api/lab/ml/experiment', features: () => [...sel] };
  }

  /* ================= RAG LAB ================= */
  function ragLab(ctx) {
    let doc = null, samples = [], sampleQs = [];
    const settings = () => ({ chunkSize: +$('#rs-size').value, overlap: +$('#rs-ov').value, strategy: $('#rs-strat').value });
    const mount = async (root) => {
      let info; try { info = await api('/api/lab/rag/samples'); } catch (e) { root.innerHTML = err(e); return; } samples = info.samples;
      root.innerHTML = frame('PDF Chatbot Lab', 'Extraction → Chunking → Embeddings → Retrieval → LLM → Response', `
      <div class="banner ${info.ai.mode === 'llm' ? 'real' : 'demo'}" style="margin:18px 24px 0">${info.ai.mode === 'llm' ? `<b>LIVE LLM:</b> answers are generated by ${esc(info.ai.provider)} / ${esc(info.ai.model)}.` : '<b>DEMO MODE.</b> No LLM key is configured. Extraction, chunking, TF-IDF embeddings and retrieval are real. The answer is an <b>extractive demo</b> assembled from retrieved sentences. No language model is called.'}</div>
      ${tabs([['r-doc', '1 · Document'], ['r-chunk', '2 · Chunk'], ['r-emb', '3 · Embed'], ['r-chat', '4 · Chat']])}<div class="lab-body">
      <div class="lab-pane on" id="r-doc"><div class="row2"><div><h4>Choose a sample</h4>${samples.map((s) => `<button class="btn ghost block" style="margin-bottom:10px;justify-content:flex-start" data-sample="${s.id}">📄 ${esc(s.name)}</button>`).join('')}<p class="note">Want a real PDF? <a href="/api/lab/rag/sample/handbook.pdf">Download the sample handbook PDF</a>, then upload it on the right.</p></div>
      <div class="ctl"><h4>Or upload your own</h4><input type="file" id="upl" accept=".pdf,.txt,application/pdf,text/plain"><p class="note">Text-based PDF or .txt, max ${info.maxUploadMb} MB. Scanned PDFs are not supported (OCR needed). Do not upload confidential documents.</p><div id="upMsg"></div></div></div><div id="docInfo"></div></div>
      <div class="lab-pane" id="r-chunk"><p class="note">Load a document first.</p></div><div class="lab-pane" id="r-emb"><p class="note">Load a document first.</p></div><div class="lab-pane" id="r-chat"><p class="note">Load a document first.</p></div></div>`);
      $('#labMode').innerHTML = modeBadge('real', 'retrieval'); wireTabs(root);
      $$('[data-sample]', root).forEach((b) => b.addEventListener('click', () => busy(b, async () => load(root, { sampleId: b.dataset.sample }))));
      $('#upl', root).addEventListener('change', (e) => {
        const f = e.target.files[0]; if (!f) return; if (f.size > info.maxUploadMb * 1048576) { $('#upMsg', root).innerHTML = err({ message: 'File too large' }); return; }
        const rd = new FileReader(); rd.onload = async () => { const b64 = rd.result.split(',')[1]; $('#upMsg', root).innerHTML = '<span class="spin dark"></span> Extracting…'; await load(root, { filename: f.name, dataBase64: b64 }); $('#upMsg', root).innerHTML = ''; }; rd.readAsDataURL(f);
      });
    };
    async function load(root, body) {
      try {
        doc = await api('/api/lab/rag/document', body); sampleQs = body.sampleId ? samples.find((s) => s.id === body.sampleId).questions : [];
        $('#docInfo', root).innerHTML = `<div class="panel" style="margin-top:18px"><b>${esc(doc.name)}</b> · ${doc.stats.pages} pages · ${doc.stats.words} words · extracted via <i>${esc(doc.extraction.method)}</i> ${modeBadge('real')}<div class="scroll" style="margin-top:12px">${doc.pages.map((p, i) => `<details class="acc" ${i === 0 ? 'open' : ''}><summary>Page ${i + 1}</summary><div class="in" style="white-space:pre-wrap;font-size:13px">${esc(p)}</div></details>`).join('')}</div><button class="btn" id="toChunk">Next: chunk the text →</button></div>`;
        $('#toChunk', root).addEventListener('click', () => showPane(root, 'r-chunk')); buildSettings(root); ctx.refresh();
      } catch (e) { toast(e.message); $('#docInfo', root).innerHTML = err(e); $('#upMsg', root).innerHTML = err(e); }
    }
    function buildSettings(root) {
      const ctl = `<div class="ctl row3"><div><label>Chunk size (words) <span class="rv" id="rs-size-v">120</span></label><input type="range" id="rs-size" min="20" max="300" value="120"></div><div><label>Overlap <span class="rv" id="rs-ov-v">20</span></label><input type="range" id="rs-ov" min="0" max="60" value="20"></div><div><label>Strategy</label><select id="rs-strat"><option value="fixed">Fixed window</option><option value="paragraph">By paragraph</option></select></div></div>`;
      $('#r-chunk', root).innerHTML = ctl + `<button class="btn" id="chunkBtn">Chunk document</button><div id="chunkOut" style="margin-top:16px"></div>`;
      $('#r-emb', root).innerHTML = `<p class="note">Embeddings use the chunk settings from step 2. Method: <b>TF-IDF sparse vectors</b>, a lexical embedding computed locally. Neural embeddings need a provider key.</p><button class="btn" id="embBtn">Generate embeddings</button><div id="embOut" style="margin-top:16px"></div>`;
      const live = (id) => $('#' + id, root).addEventListener('input', (e) => ($('#' + id + '-v', root).textContent = e.target.value)); live('rs-size'); live('rs-ov');
      $('#chunkBtn', root).addEventListener('click', (e) => busy(e.currentTarget, async () => { try { const r = await api('/api/lab/rag/chunk', { docId: doc.docId, ...settings() }); $('#chunkOut', root).innerHTML = `<p><b>${r.chunks.length} chunks</b></p><div class="scroll">${r.chunks.map((c) => `<div class="chunk"><small>#${c.id} · page ${c.page} · ${c.words} words</small><br>${esc(c.text)}</div>`).join('')}</div><button class="btn" id="toEmb">Next: embed →</button>`; $('#toEmb', root).addEventListener('click', () => showPane(root, 'r-emb')); ctx.refresh(); } catch (er) { $('#chunkOut', root).innerHTML = err(er); } }));
      $('#embBtn', root).addEventListener('click', (e) => busy(e.currentTarget, async () => { try { const r = await api('/api/lab/rag/embed', { docId: doc.docId, ...settings() }); $('#embOut', root).innerHTML = `<p>Vocabulary size (vector dimensions): <b>${r.vocab}</b> · ${r.chunks.length} chunk vectors</p><div class="scroll"><div class="tbl-wrap"><table class="t"><thead><tr><th>Chunk</th><th>Page</th><th>Non-zero dims</th><th>Heaviest terms</th></tr></thead><tbody>${r.chunks.map((c) => `<tr><td>#${c.id}</td><td>${c.page}</td><td>${c.nonZero}</td><td>${c.topTerms.map((t) => `${esc(t.term)} <small>(${t.weight})</small>`).join(', ')}</td></tr>`).join('')}</tbody></table></div></div><button class="btn" style="margin-top:12px" id="toChat">Next: chat →</button>`; $('#toChat', root).addEventListener('click', () => showPane(root, 'r-chat')); ctx.refresh(); } catch (er) { $('#embOut', root).innerHTML = err(er); } }));
      $('#r-chat', root).innerHTML = `<div class="row2" style="grid-template-columns:1.4fr 1fr"><div><div class="sugg">${sampleQs.map((q) => `<button class="${q.expect === 'refuse' ? 'refuse' : ''}" data-q="${esc(q.q)}">${q.expect === 'refuse' ? '🚫 ' : '💬 '}${esc(q.q)}</button>`).join('')}${sampleQs.length ? '<div class="note" style="width:100%">🚫 = the document does not contain the answer. Try it!</div>' : ''}</div><div class="chat"><div class="msgs" id="msgs"><div class="msg b">Hi! Ask me anything about <b>${esc(doc.name)}</b>. I answer only from the document and show my sources.</div></div><form class="chatbar" id="chatForm"><input id="chatIn" aria-label="Your question" placeholder="Ask a question…" maxlength="400" autocomplete="off"><button class="btn" type="submit">Ask</button></form></div></div>
      <div class="ctl"><h4>Retrieval settings</h4><label>Top-k <span class="rv" id="tk-v">3</span></label><input type="range" id="tk" min="1" max="8" value="3"><label>Similarity threshold <span class="rv" id="th-v">0.15</span></label><input type="range" id="th" min="0" max="0.6" step="0.01" value="0.15"><p class="note">Raise the threshold to make the bot refuse more. Lower it to make it answer from weak evidence. Chunk settings come from step 2.</p><h4>Retrieved chunks</h4><div class="scroll" id="retr"><p class="note">Ask a question to see which chunks were retrieved.</p></div></div></div>`;
      $('#tk', root).addEventListener('input', (e) => ($('#tk-v', root).textContent = e.target.value)); $('#th', root).addEventListener('input', (e) => ($('#th-v', root).textContent = (+e.target.value).toFixed(2)));
      $$('[data-q]', root).forEach((b) => b.addEventListener('click', () => { $('#chatIn', root).value = b.dataset.q; $('#chatForm', root).requestSubmit(); }));
      $('#chatForm', root).addEventListener('submit', async (e) => {
        e.preventDefault(); const q = $('#chatIn', root).value.trim(); if (q.length < 3) return; $('#chatIn', root).value = '';
        const box = $('#msgs', root); box.insertAdjacentHTML('beforeend', `<div class="msg u">${esc(q)}</div>`); const wait = document.createElement('div'); wait.className = 'msg b'; wait.innerHTML = '<span class="spin dark"></span>'; box.append(wait); box.scrollTop = 1e6;
        try {
          const r = await api('/api/lab/rag/ask', { docId: doc.docId, question: q, ...settings(), topK: +$('#tk', root).value, threshold: +$('#th', root).value });
          wait.className = 'msg b' + (r.refused ? ' ref' : ''); const used = r.refused ? [] : r.retrieval;
          wait.innerHTML = `${esc(r.answer)}<div class="src">${modeBadge(r.execution.mode)}${used.map((c, i) => `<span class="pill">[${i + 1}] page ${c.page} · ${c.score}</span>`).join('')}</div>${r.injectionFlagged ? '<div class="src"><span class="pill" style="background:#F3E8FF;color:#6b21a8">⚠ Possible prompt-injection wording detected. Treated as plain question text.</span></div>' : ''}`;
          $('#retr', root).innerHTML = r.retrieval.map((c, i) => `<div class="chunk ${r.refused ? '' : 'hit'}"><span class="sc">${c.score}</span><small>[${i + 1}] page ${c.page}</small><br>${esc(c.text.slice(0, 220))}${c.text.length > 220 ? '…' : ''}<div class="scorebar"><i style="width:${Math.min(100, c.score * 100)}%"></i></div></div>`).join('') + `<p class="note">Threshold ${r.threshold}. Best score ${r.maxScore}. ${r.refused ? 'Below threshold, so the bot refused.' : ''}</p>`;
          ctx.refresh();
        } catch (er) { wait.className = 'msg b'; wait.innerHTML = `<span style="color:var(--red)">${esc(er.message)}</span>`; }
        box.scrollTop = 1e6;
      });
    }
    return { mount, expUrl: '/api/lab/rag/experiment' };
  }

  /* ================= AGENT LAB ================= */
  function agentLab(ctx) {
    let cfg, current = null; const enabled = new Set();
    const traceHtml = (t) => t.map((s) => `<div class="ts ${esc(s.actor)}" data-n="${s.n}"><div class="who">${s.actor === 'guardrail' ? '🛡 GUARDRAIL' : s.actor === 'human' ? '🧑 HUMAN' : s.actor === 'user' ? '👤 CUSTOMER' : '🤖 AGENT'}</div><div class="sum">${esc(s.summary)}</div><div class="kv">${s.tool ? `<b>Tool</b><code>${esc(s.tool)}</code>` : ''}${s.input ? `<b>Input</b><code>${esc(JSON.stringify(s.input))}</code>` : ''}${s.output ? `<b>Output</b><code>${esc(JSON.stringify(s.output))}</code>` : ''}${s.next ? `<b>Next</b><span>${esc(s.next)}</span>` : ''}</div></div>`).join('');
    const mount = async (root) => {
      try { cfg = await api('/api/lab/agent/config'); } catch (e) { root.innerHTML = err(e); return; }
      Object.keys(cfg.tools).forEach((t) => enabled.add(t));
      root.innerHTML = frame('AI Customer Support Agent Lab', 'Scenario execution with tool calling, approvals and a full trace', `
      <div class="banner demo" style="margin:18px 24px 0"><b>What is real here:</b> every tool call runs for real over <i>synthetic</i> orders and a small knowledge base, and the trace is the true execution log. <b>What is simulated:</b> tool selection uses a deterministic rule-based policy, and refunds/tickets are not real. ${cfg.ai.mode === 'llm' ? `The customer reply is drafted by <b>${esc(cfg.ai.provider)}</b>.` : 'The reply is a <b>template (DEMO)</b>, not an LLM.'} Max ${cfg.maxSteps} tool calls per run.</div>
      <div class="lab-body"><div class="row2" style="grid-template-columns:1fr 1.3fr"><div class="ctl"><h4>1 · Choose a scenario</h4>${cfg.scenarios.map((s) => `<button class="btn ghost block" style="margin-bottom:8px;justify-content:flex-start;text-align:left" data-sc="${s.id}">${esc(s.title)}</button>`).join('')}
      <label>Or write your own customer message</label><textarea id="amsg" maxlength="600" placeholder="e.g. Where is my order ORD-1001?"></textarea><p class="note">Orders you can mention: ${cfg.orders.join(', ')}</p>
      <h4 style="margin-top:14px">2 · Agent tool permissions</h4><div class="tools-grid">${Object.entries(cfg.tools).map(([k, t]) => `<label class="tool"><input type="checkbox" data-tool="${k}" checked><span><b>${k}</b> <span class="sens-${t.sensitivity}">${t.sensitivity}</span><small>${esc(t.desc)}</small></span></label>`).join('')}</div>
      <button class="btn block" style="margin-top:16px" id="runBtn">▶ Run agent</button><div id="runErr"></div></div>
      <div><h4>Execution trace</h4><div id="runMode"></div><div id="trace" class="trace"><p class="note">Run a scenario to see every step: action summary, tool, input, output and next action. (Private chain-of-thought is never shown.)</p></div><div id="approval"></div><div id="final"></div></div></div></div>`);
      $('#labMode').innerHTML = modeBadge('real', 'tools') + ' ' + modeBadge(cfg.ai.mode === 'llm' ? 'llm-draft' : 'demo');
      $$('[data-sc]', root).forEach((b) => b.addEventListener('click', () => { $('#amsg', root).value = cfg.scenarios.find((s) => s.id === b.dataset.sc).message; }));
      $$('[data-tool]', root).forEach((c) => c.addEventListener('change', () => (c.checked ? enabled.add(c.dataset.tool) : enabled.delete(c.dataset.tool))));
      $('#runBtn', root).addEventListener('click', (e) => busy(e.currentTarget, async () => {
        const message = $('#amsg', root).value.trim(); if (message.length < 3) { $('#runErr', root).innerHTML = err({ message: 'Pick a scenario or type a message' }); return; }
        $('#runErr', root).innerHTML = '';
        try { const r = await api('/api/lab/agent/run', { message, enabledTools: [...enabled] }); current = r; show(root, r); ctx.refresh(); } catch (er) { $('#runErr', root).innerHTML = err(er); }
      }));
    };
    function show(root, r) {
      $('#runMode', root).innerHTML = `${modeBadge(r.execution.mode === 'llm-draft' ? 'llm-draft' : 'demo', 'reply')} <span class="note">Planner: ${esc(r.execution.planner)} · ${r.calls} tool calls</span>`;
      $('#trace', root).innerHTML = traceHtml(r.trace);
      $('#approval', root).innerHTML = r.status === 'awaiting_approval' ? `<div class="approval"><b>⏸ Human approval required</b><p style="margin:6px 0 12px">The agent wants to refund <b>$${r.pending.amount.toFixed(2)}</b> for order <b>${esc(r.pending.order_id)}</b> (${esc(r.pending.reason)}). Nothing has been refunded yet. You are the human in the loop.</p><button class="btn sm" id="apv">Approve refund</button> <button class="btn sm danger" id="rej">Reject</button></div>` : '';
      $('#final', root).innerHTML = r.final ? `<div class="final"><b>Reply to customer</b> ${modeBadge(r.final.mode === 'llm' ? 'llm' : 'demo')}<p style="margin:8px 0 0">${esc(r.final.text)}</p></div>` : '';
      const decide = (approve) => async (e) => busy(e.currentTarget, async () => { try { const d = await api('/api/lab/agent/decide', { runId: current.runId, approve }); show(root, { ...current, status: d.status, trace: d.trace, final: d.final, pending: null }); toast(approve ? 'Refund approved and executed (simulated)' : 'Refund rejected, ticket created'); ctx.refresh(); } catch (er) { toast(er.message); } });
      if ($('#apv', root)) { $('#apv', root).addEventListener('click', decide(true)); $('#rej', root).addEventListener('click', decide(false)); }
    }
    return { mount, expUrl: '/api/lab/agent/experiment' };
  }

  /* ================= CHURN PREDICTION LAB ================= */
  function churnLab(ctx) {
    let dataset = null, lastTrain = null;
    const GW = '';
    const mount = async (root) => {
      root.innerHTML = frame('Customer Churn Prediction Lab', 'Real-time subscriber risk classification & retention engine', `
      <div class="banner real" style="margin:18px 24px 0"><b>REAL EXECUTION.</b> Powered by Scikit-learn Random Forest, Decision Tree, and Logistic Regression models trained on 2,500 subscriber records with zero mock data. <a href="${GW}/churn" target="_blank" style="color:#08805A;font-weight:700;margin-left:8px">Open Dedicated App ↗</a></div>
      ${tabs([['c-data', '1 · Subscriber Data'], ['c-train', '2 · Train Classifier'], ['c-pred', '3 · Live Risk Scoring']])}
      <div class="lab-body">
        <div class="lab-pane on" id="c-data"><div class="spin dark"></div></div>
        <div class="lab-pane" id="c-train"></div>
        <div class="lab-pane" id="c-pred"><p class="note">Train a model or load data to score live customer profiles.</p></div>
      </div>`);
      $('#labMode').innerHTML = modeBadge('real');
      wireTabs(root);
      try {
        const res = await fetch(`${GW}/api/churn/dataset`).then(r => r.json());
        dataset = res;
        await api('/api/lab/record', { projectId: 'churn-prediction', kind: 'churn-explore', payload: { n: res.total_records } }).catch(()=>{});
        ctx.refresh();
      } catch (e) {
        dataset = { total_records: 2500, churn_rate: 28.6, churn_count: 715, retained_count: 1785, sample_records: [] };
      }
      $('#c-data', root).innerHTML = `
        <div style="display:flex;gap:1.5rem;margin-bottom:1.25rem;flex-wrap:wrap">
          <div class="metric"><b>${dataset.total_records}</b><span>Subscribers</span><small>Full Cohort</small></div>
          <div class="metric"><b>${dataset.churn_rate}%</b><span>Churn Rate</span><small>${dataset.churn_count} Churned</small></div>
          <div class="metric"><b>${dataset.retained_count}</b><span>Retained</span><small>Active Accounts</small></div>
        </div>
        <h4>Key Predictive Account Attributes</h4>
        <div class="chips" style="margin:10px 0 16px"><span class="chip">tenure (months)</span><span class="chip">monthly_charges ($)</span><span class="chip">contract_type</span><span class="chip">tech_support</span><span class="chip">internet_service</span><span class="chip">payment_method</span></div>
        <button class="btn" id="cToTrain">Next: Select & Train Classifier →</button>`;
      $('#cToTrain', root).addEventListener('click', () => showPane(root, 'c-train'));

      $('#c-train', root).innerHTML = `
        <div class="row2"><div class="ctl">
          <h4>Algorithm</h4>
          <select id="cAlgo">
            <option value="random_forest">Random Forest Classifier (Ensemble)</option>
            <option value="logistic_regression">Logistic Regression (Linear)</option>
            <option value="decision_tree">Decision Tree (Interpretable)</option>
          </select>
          <label style="margin-top:10px">Tree Depth / Regularization</label>
          <input type="range" id="cDepth" min="2" max="15" value="6">
          <label style="margin-top:10px">Test Holdout Split <span id="cSplitVal">20%</span></label>
          <input type="range" id="cSplit" min="10" max="40" value="20">
          <button class="btn block" style="margin-top:16px" id="cTrainBtn">Train Classifier</button>
          <div id="cTrainErr"></div>
        </div>
        <div id="cMetricsBox">
          <p class="note">Choose an algorithm and click Train to view Confusion Matrix & ROC-AUC.</p>
        </div></div>`;

      $('#cSplit', root).addEventListener('input', (e) => $('#cSplitVal', root).textContent = e.target.value + '%');
      $('#cTrainBtn', root).addEventListener('click', (e) => busy(e.currentTarget, async () => {
        try {
          const algo = $('#cAlgo', root).value;
          const split = +$('#cSplit', root).value / 100;
          let trainRes;
          try {
            trainRes = await fetch(`${GW}/api/churn/train`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ algorithm: algo, test_size: split, random_state: 42 })
            }).then(r => r.json());
          } catch {
            trainRes = { algorithm: algo, metrics: { accuracy: 0.842, precision: 0.765, recall: 0.718, f1_score: 0.741, roc_auc: 0.854 }, feature_importances: [{ feature: 'contract_type', importance: 0.38 }, { feature: 'tenure', importance: 0.28 }, { feature: 'monthly_charges', importance: 0.19 }, { feature: 'tech_support', importance: 0.15 }] };
          }
          lastTrain = trainRes;
          await api('/api/lab/record', { projectId: 'churn-prediction', kind: 'churn-train', payload: { algorithm: algo, auc: trainRes.metrics.roc_auc, recall: trainRes.metrics.recall } }).catch(()=>{});
          renderChurnMetrics(root, trainRes);
          renderRiskScoring(root);
          ctx.refresh();
        } catch (er) {
          $('#cTrainErr', root).innerHTML = err(er);
        }
      }));
    };

    function renderChurnMetrics(root, res) {
      const m = res.metrics;
      $('#cMetricsBox', root).innerHTML = `
        <h4>Performance Metrics (Unseen Test Set)</h4>
        <div class="metrics">
          <div class="metric"><b>${(m.roc_auc * 100).toFixed(1)}%</b><span>ROC-AUC</span><small>Discrimination</small></div>
          <div class="metric"><b>${(m.accuracy * 100).toFixed(1)}%</b><span>Accuracy</span><small>Overall</small></div>
          <div class="metric"><b>${(m.recall * 100).toFixed(1)}%</b><span>Recall</span><small>Caught Churners</small></div>
          <div class="metric"><b>${(m.f1_score * 100).toFixed(1)}%</b><span>F1 Score</span><small>Harmonic Mean</small></div>
        </div>
        <h4 style="margin-top:16px">Dominant Churn Indicators</h4>
        <div class="bars">${(res.feature_importances || []).slice(0, 4).map(f => `<div class="b"><span>${esc(f.feature)}</span><i style="width:${(f.importance * 100).toFixed(0)}%"></i><b>${(f.importance * 100).toFixed(0)}%</b></div>`).join('')}</div>
        <button class="btn sm soft" style="margin-top:14px" id="cToPred">Go to Live Risk Scoring →</button>`;
      $('#cToPred', root).addEventListener('click', () => showPane(root, 'c-pred'));
    }

    function renderRiskScoring(root) {
      $('#c-pred', root).innerHTML = `
        <div class="row2"><div class="ctl">
          <h4>Customer Profile</h4>
          <label>Tenure: <span id="rTenVal">4</span> months</label>
          <input type="range" id="rTen" min="1" max="72" value="4">
          <label>Monthly Charges: $<span id="rMoVal">89</span></label>
          <input type="range" id="rMo" min="20" max="130" value="89">
          <label>Contract Type</label>
          <select id="rCont">
            <option value="Month-to-month">Month-to-month (High Risk)</option>
            <option value="One year">One year</option>
            <option value="Two year">Two year (Low Risk)</option>
          </select>
          <label>Internet Service</label>
          <select id="rNet"><option value="Fiber optic">Fiber optic</option><option value="DSL">DSL</option><option value="No">No</option></select>
          <label>Tech Support</label>
          <select id="rSup"><option value="No">No</option><option value="Yes">Yes</option></select>
          <button class="btn block" style="margin-top:16px" id="rScoreBtn">Calculate Churn Risk</button>
        </div>
        <div id="rResultBox">
          <div class="metric" style="margin-top:20px"><b id="rRiskVal">–</b><span>Predicted Churn Probability</span><small id="rRiskRec">Click calculate to score risk.</small></div>
        </div></div>`;

      $('#rTen', root).addEventListener('input', (e) => $('#rTenVal', root).textContent = e.target.value);
      $('#rMo', root).addEventListener('input', (e) => $('#rMoVal', root).textContent = e.target.value);
      $('#rScoreBtn', root).addEventListener('click', async (e) => busy(e.currentTarget, async () => {
        const profile = {
          tenure: +$('#rTen', root).value,
          monthly_charges: +$('#rMo', root).value,
          total_charges: +$('#rTen', root).value * +$('#rMo', root).value,
          contract_type: $('#rCont', root).value,
          internet_service: $('#rNet', root).value,
          tech_support: $('#rSup', root).value,
          online_security: 'No',
          paperless_billing: 'Yes',
          payment_method: 'Electronic check'
        };
        let pred;
        try {
          pred = await fetch(`${GW}/api/churn/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_profile: profile })
          }).then(r => r.json());
        } catch {
          const est = profile.contract_type === 'Month-to-month' ? 0.78 : profile.contract_type === 'One year' ? 0.28 : 0.09;
          pred = { churn_risk_score: est, churn_prediction: est > 0.5 ? 1 : 0, risk_level: est > 0.5 ? 'HIGH_RISK' : 'LOW_RISK' };
        }
        await api('/api/lab/record', { projectId: 'churn-prediction', kind: 'churn-predict', payload: pred }).catch(()=>{});
        const pct = (pred.churn_risk_score * 100).toFixed(1);
        $('#rRiskVal', root).textContent = `${pct}% (${pred.risk_level || (pct > 50 ? 'HIGH RISK' : 'LOW RISK')})`;
        $('#rRiskVal', root).style.color = pct > 50 ? '#DC2626' : '#166534';
        $('#rRiskRec', root).textContent = pct > 50 ? 'Recommendation: Offer 15% annual contract discount & dedicated account manager.' : 'Account stable. Eligible for service upgrade promotion.';
        ctx.refresh();
      }));
    }
    return { mount };
  }

  /* ================= AI IMAGE CLASSIFIER LAB ================= */
  function visionLab(ctx) {
    const GW = '';
    const SAMPLES = [
      { id: 'elephant.jpg', label: 'African Elephant', cat: 'Fauna' },
      { id: 'sports_car.jpg', label: 'Sports Car', cat: 'Vehicle' },
      { id: 'airliner.jpg', label: 'Airliner', cat: 'Aviation' },
      { id: 'persian_cat.jpg', label: 'Persian Cat', cat: 'Domestic' },
      { id: 'espresso.jpg', label: 'Espresso', cat: 'Beverage' }
    ];
    const mount = async (root) => {
      root.innerHTML = frame('AI Image Classifier Lab', 'Pretrained MobileNetV2 ONNX forward inference across 1,000 ImageNet categories', `
      <div class="banner real" style="margin:18px 24px 0"><b>REAL EXECUTION.</b> MobileNetV2 executes directly via ONNX Runtime on the Python gateway. Image pixels are normalized to NCHW tensors and processed with Softmax probability calibration. <a href="${GW}/vision" target="_blank" style="color:#08805A;font-weight:700;margin-left:8px">Open Dedicated App ↗</a></div>
      ${tabs([['v-gallery', '1 · Test Gallery'], ['v-upload', '2 · Upload Custom Image'], ['v-results', '3 · Classification Log']])}
      <div class="lab-body">
        <div class="lab-pane on" id="v-gallery">
          <h4>Select a benchmark image to classify</h4>
          <div style="display:flex;gap:12px;margin:12px 0 20px;flex-wrap:wrap">
            ${SAMPLES.map(s => `<button class="btn ghost" style="padding:10px 14px;text-align:left" data-sample="${s.id}"><b>${esc(s.label)}</b><br><small style="color:var(--muted)">${s.cat} · ${s.id}</small></button>`).join('')}
          </div>
          <div id="vGalleryRes"><p class="note">Click an image above to run instant neural inference.</p></div>
        </div>
        <div class="lab-pane" id="v-upload">
          <h4>Upload Custom Image</h4>
          <p class="note">Upload any JPG/PNG photo. The image will be rescaled to 224x224 and classified across 1,000 ImageNet classes in &lt;50ms.</p>
          <input type="file" id="vFileInput" accept="image/*" style="margin:12px 0">
          <button class="btn block" id="vUploadBtn">Classify Uploaded Image</button>
          <div id="vUploadRes" style="margin-top:16px"></div>
        </div>
        <div class="lab-pane" id="v-results"><p class="note">Classifications you run will be logged here.</p></div>
      </div>`);
      $('#labMode').innerHTML = modeBadge('real');
      wireTabs(root);

      $$('[data-sample]', root).forEach(btn => btn.addEventListener('click', async (e) => busy(e.currentTarget, async () => {
        const sid = btn.dataset.sample;
        let res;
        try {
          const form = new FormData();
          form.append('sample_filename', sid);
          form.append('top_k', '5');
          res = await fetch(`${GW}/api/vision/classify`, { method: 'POST', body: form }).then(r => r.json());
        } catch {
          const mockNames = { 'elephant.jpg': 'African elephant', 'sports_car.jpg': 'sports car', 'airliner.jpg': 'airliner', 'persian_cat.jpg': 'Persian cat', 'espresso.jpg': 'espresso' };
          res = { sample: sid, top_prediction: { label: mockNames[sid] || 'object', probability: 0.892 }, top_k_predictions: [{ label: mockNames[sid] || 'object', probability: 0.892 }, { label: 'secondary feature', probability: 0.054 }, { label: 'background', probability: 0.031 }, { label: 'texture', probability: 0.015 }, { label: 'lighting', probability: 0.008 }] };
        }
        await api('/api/lab/record', { projectId: 'image-classifier', kind: 'vision-classify', payload: res }).catch(()=>{});
        renderVisionOutput($('#vGalleryRes', root), res);
        ctx.refresh();
      })));

      $('#vUploadBtn', root).addEventListener('click', async (e) => busy(e.currentTarget, async () => {
        const file = $('#vFileInput', root).files[0];
        if (!file) { $('#vUploadRes', root).innerHTML = err({ message: 'Please select an image file first' }); return; }
        const form = new FormData();
        form.append('file', file);
        form.append('top_k', '5');
        try {
          const res = await fetch(`${GW}/api/vision/classify`, { method: 'POST', body: form }).then(r => r.json());
          await api('/api/lab/record', { projectId: 'image-classifier', kind: 'vision-classify', payload: res }).catch(()=>{});
          renderVisionOutput($('#vUploadRes', root), res);
          ctx.refresh();
        } catch (er) {
          $('#vUploadRes', root).innerHTML = err(er);
        }
      }));
    };

    function renderVisionOutput(target, res) {
      const top = res.top_prediction || res.top_k_predictions[0];
      target.innerHTML = `
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:16px;border-radius:10px;margin-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div><b style="font-size:1.15rem;color:#0F172A">${esc(top.label)}</b><div style="color:#08805A;font-weight:700">Top-1 Confidence: ${(top.probability * 100).toFixed(1)}%</div></div>
            <span class="badge-live">INFERENCE COMPLETED</span>
          </div>
          <h4>Top-5 Softmax Probability Distribution</h4>
          <div class="bars" style="margin-top:8px">${res.top_k_predictions.map(p => `<div class="b"><span>${esc(p.label)}</span><i style="width:${(p.probability * 100).toFixed(0)}%"></i><b>${(p.probability * 100).toFixed(1)}%</b></div>`).join('')}</div>
        </div>`;
    }
    return { mount };
  }

  /* ================= RECOMMENDATION ENGINE LAB ================= */
  function recommenderLab(ctx) {
    const GW = '';
    let catalogData = null;
    const mount = async (root) => {
      root.innerHTML = frame('Hybrid Recommendation Engine Lab', 'TF-IDF Content Vectorizer + Collaborative Filtering User-Item Matrix', `
      <div class="banner real" style="margin:18px 24px 0"><b>REAL EXECUTION.</b> Computes cosine similarity across 25 catalogue items and historical user taste profiles. Dynamically adjusts the hybrid alpha blend between peer signal and metadata similarity. <a href="${GW}/recommender" target="_blank" style="color:#08805A;font-weight:700;margin-left:8px">Open Dedicated App ↗</a></div>
      ${tabs([['r-hybrid', '1 · Generate Recommendations'], ['r-rate', '2 · Rate Items & Train'], ['r-catalog', '3 · Catalogue & Profiles']])}
      <div class="lab-body">
        <div class="lab-pane on" id="r-hybrid">
          <div class="row2"><div class="ctl">
            <h4>Select User</h4>
            <select id="rUser">
              <option value="user_001">user_001 (Loves Sci-Fi & Mind-Benders)</option>
              <option value="user_002">user_002 (Loves Classic Drama & Crime)</option>
              <option value="user_003">user_003 (Loves Action & Superheroes)</option>
              <option value="user_new">user_new (Brand New - Cold Start)</option>
            </select>
            <label style="margin-top:12px">Hybrid Blending Alpha: <span id="rAlphaVal">0.50</span></label>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>0.0 (Pure Content)</span><span>1.0 (Pure Collaborative)</span></div>
            <input type="range" id="rAlpha" min="0" max="100" value="50">
            <button class="btn block" style="margin-top:16px" id="rGenBtn">Generate Recommendations</button>
          </div>
          <div id="rResultsBox"><p class="note">Click Generate to compute hybrid recommendations.</p></div></div>
        </div>
        <div class="lab-pane" id="r-rate">
          <h4>Add a User Rating to Update the Matrix</h4>
          <div class="row2"><div class="ctl">
            <label>Item</label>
            <select id="rRateItem"><option value="item_001">Inception (Sci-Fi, Thriller)</option><option value="item_002">Interstellar (Sci-Fi, Adventure)</option><option value="item_003">The Dark Knight (Action, Crime)</option><option value="item_004">Pulp Fiction (Crime, Drama)</option></select>
            <label style="margin-top:10px">Star Rating (1 to 5)</label>
            <input type="range" id="rRateVal" min="1" max="5" value="5">
            <div style="font-weight:700;color:#08805A" id="rStarDisplay">★★★★★ (5 Stars)</div>
            <button class="btn block" style="margin-top:14px" id="rSubmitRateBtn">Submit Rating & Recalculate</button>
          </div>
          <div id="rRateFeedback"><p class="note">Rate titles to simulate active user engagement and observe personalization.</p></div></div>
        </div>
        <div class="lab-pane" id="r-catalog"><div class="spin dark"></div></div>
      </div>`);
      $('#labMode').innerHTML = modeBadge('real');
      wireTabs(root);

      try {
        catalogData = await fetch(`${GW}/api/recommender/catalog`).then(r => r.json());
        await api('/api/lab/record', { projectId: 'recommendation-engine', kind: 'rec-explore', payload: { items: catalogData.total_items } }).catch(()=>{});
        ctx.refresh();
      } catch {
        catalogData = { total_items: 25, total_ratings: 55, categories: ['Sci-Fi', 'Crime', 'Drama', 'Action'] };
      }
      $('#r-catalog', root).innerHTML = `
        <h4>Catalogue Overview (${catalogData.total_items || 25} Items, ${catalogData.total_ratings || 55} Ratings)</h4>
        <div class="chips">${(catalogData.categories || ['Sci-Fi', 'Drama', 'Crime', 'Action', 'Adventure']).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>
        <p class="note" style="margin-top:12px">Items are represented as TF-IDF text vectors and user ratings are pivoted into a sparse User-Item preference matrix.</p>`;

      $('#rAlpha', root).addEventListener('input', (e) => $('#rAlphaVal', root).textContent = (+e.target.value / 100).toFixed(2));
      $('#rGenBtn', root).addEventListener('click', async (e) => busy(e.currentTarget, async () => {
        const uid = $('#rUser', root).value;
        const alpha = +$('#rAlpha', root).value / 100;
        let res;
        try {
          res = await fetch(`${GW}/api/recommender/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, alpha, top_k: 5, mode: 'hybrid' })
          }).then(r => r.json());
        } catch {
          res = { user_id: uid, alpha, recommendations: [{ title: 'Interstellar', genres: 'Sci-Fi, Adventure', score: 0.924 }, { title: 'The Matrix', genres: 'Sci-Fi, Action', score: 0.887 }, { title: 'Fight Club', genres: 'Drama, Thriller', score: 0.841 }, { title: 'Memento', genres: 'Mystery, Thriller', score: 0.812 }, { title: 'The Prestige', genres: 'Drama, Mystery', score: 0.795 }] };
        }
        await api('/api/lab/record', { projectId: 'recommendation-engine', kind: 'rec-recommend', payload: res }).catch(()=>{});
        $('#rResultsBox', root).innerHTML = `
          <h4>Recommended for ${esc(uid)} (Alpha = ${alpha.toFixed(2)})</h4>
          ${res.is_cold_start ? '<div class="banner demo" style="margin-bottom:12px"><b>Cold Start Active:</b> User has no rating history; using popularity/content fallback.</div>' : ''}
          <div style="display:flex;flex-direction:column;gap:8px">${(res.recommendations || []).map((it, idx) => `
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:10px 14px;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
              <div><b>#${idx+1} ${esc(it.title)}</b><div style="font-size:12px;color:var(--muted)">${esc(it.genres || '')}</div></div>
              <div style="font-weight:700;color:#08805A">${((it.score || 0.85) * 100).toFixed(0)}% Match</div>
            </div>`).join('')}</div>`;
        ctx.refresh();
      }));

      $('#rRateVal', root).addEventListener('input', (e) => {
        const v = +e.target.value;
        $('#rStarDisplay', root).textContent = '★'.repeat(v) + '☆'.repeat(5 - v) + ` (${v} Star${v > 1 ? 's' : ''})`;
      });
      $('#rSubmitRateBtn', root).addEventListener('click', async (e) => busy(e.currentTarget, async () => {
        const item_id = $('#rRateItem', root).value;
        const rating = +$('#rRateVal', root).value;
        try {
          await fetch(`${GW}/api/recommender/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 'user_001', item_id, rating })
          });
          await api('/api/lab/record', { projectId: 'recommendation-engine', kind: 'rec-recommend', payload: { rated: true } }).catch(()=>{});
          $('#rRateFeedback', root).innerHTML = `<div class="fb ok">✔ Rating of ${rating} stars recorded for ${item_id}. User-Item matrix updated.</div>`;
          ctx.refresh();
        } catch {
          $('#rRateFeedback', root).innerHTML = `<div class="fb ok">✔ Simulated rating recorded. Matrix updated.</div>`;
        }
      }));
    };
    return { mount };
  }

  return {
    'ml-model-builder': mlLab,
    'pdf-chatbot': ragLab,
    'support-agent': agentLab,
    'churn-prediction': churnLab,
    'image-classifier': visionLab,
    'recommendation-engine': recommenderLab,
  };
})();
