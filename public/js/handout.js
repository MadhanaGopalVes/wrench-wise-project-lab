/* Immersive handout engine: renders the unlocked guide for ANY project from its content JSON.
   Sections: Objective, Prerequisites, Concepts, Architecture, Tools, Guided Build, Lab, Experiments,
   Expected Result, Knowledge Checkpoints, Final Challenge, Assessment, Outcomes, Certificate, Share, Programme. */
const Handout = (() => {
  let G, P, ST, ROOT, labCtx;
  const SECTIONS = [
    ['s-mission', '01', 'Objective', 'LEARN'], ['s-prereq', '02', 'Prerequisites'], ['s-concepts', '', 'Concept Explorer'], ['s-arch', '', 'Architecture Explorer'], ['s-tools', '03', 'Tools'],
    ['s-steps', '04', 'Steps', 'BUILD', 'steps'], ['s-lab', '', 'Project Lab', null, 'milestones'], ['s-exp', '', 'Experiments'],
    ['s-result', '05', 'Expected Result'], ['s-checks', '', 'Knowledge Checkpoints', 'PROVE', 'checks'], ['s-challenge', '', 'Final Challenge', null, 'challenge'], ['s-quiz', '', 'Assessment', null, 'quiz'],
    ['s-outcomes', '', 'Learning Outcomes', 'NEXT'], ['s-cert', '', 'Certificate', null, 'cert'], ['s-share', '06', 'Share Your Project'], ['s-prog', '07', 'Related Programme'],
  ];

  const sec = (id, no, title, inner) => `<section id="${id}"><h2 class="sec">${no ? `<small>${no}</small>` : ''}${esc(title)}</h2>${inner}</section>`;

  function sideHtml() {
    let h = `<h4>YOUR PROGRESS</h4><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i id="pbar"></i></div><div class="note" id="ptxt"></div>`;
    for (const [id, no, title, group, key] of SECTIONS) {
      if (group) h += `<h4>${group}</h4>`;
      h += `<a href="#${id}" data-sec="${id}" data-key="${key || ''}"><span class="dot"></span>${no ? no + ' · ' : ''}${esc(title)}</a>`;
    }
    return h;
  }

  /* ---------- architecture ---------- */
  function archHtml() {
    const n = G.architecture.nodes;
    return `<div class="arch"><div class="arch-flow" id="archflow">${n.map((x, i) => `${i ? '<span class="arch-arrow" aria-hidden="true">→</span>' : ''}<button class="arch-node" data-i="${i}" aria-pressed="false">${esc(x.label)}<small>${esc((x.tech || '').split(/[,/(]/)[0])}</small></button>`).join('')}</div>
    <div class="arch-detail" id="archdetail"></div><button class="btn sm soft" id="archplay">▶ Play data flow</button></div>`;
  }
  function selectArch(i) {
    const x = G.architecture.nodes[i]; $$('.arch-node').forEach((b, j) => { b.classList.toggle('sel', i === j); b.setAttribute('aria-pressed', i === j); });
    $('#archdetail').innerHTML = `<h4>${esc(x.label)}</h4><div><b>What it is</b>${esc(x.desc)}</div><div><b>Responsibility</b>${esc(x.resp)}</div><div><b>Technology</b>${esc(x.tech)}</div><div><b>Inputs / outputs</b>${esc(x.io)}</div>`;
  }

  /* ---------- concept widgets (client-side, genuinely computed) ---------- */
  const PTS = [[1, 2.4], [2, 3.1], [3, 4.6], [4, 4.4], [5, 6.3], [6, 6.6], [7, 8.2], [8, 8.1], [9, 9.9], [10, 10.4]];
  function fitWidget(el) {
    el.innerHTML = `<h5>TRY IT: FIT A LINE BY HAND</h5><div class="row2"><div class="ctl"><label>Slope <span class="rv" id="fs-v">1.0</span></label><input type="range" id="fs" min="-1" max="3" step="0.05" value="0.5"><label>Intercept <span class="rv" id="fi-v">0</span></label><input type="range" id="fi" min="-5" max="10" step="0.1" value="0"><p class="note" style="margin-top:10px">Drag the sliders to minimise the <b>Mean Squared Error</b>. Then press the button to see the mathematically best line (least squares).</p><button class="btn sm soft" id="fbest" type="button">Show best fit</button></div><div class="chart"><svg viewBox="0 0 320 220" id="fsvg"></svg><div class="note" id="fmse"></div></div></div>`;
    const draw = () => {
      const m = +$('#fs', el).value, b = +$('#fi', el).value; $('#fs-v', el).textContent = m.toFixed(2); $('#fi-v', el).textContent = b.toFixed(1);
      const X = (x) => 30 + x * 27, Y = (y) => 200 - y * 15; let se = 0;
      const resid = PTS.map(([x, y]) => { const p = m * x + b; se += (y - p) ** 2; return `<line x1="${X(x)}" y1="${Y(y)}" x2="${X(x)}" y2="${Y(p)}" stroke="#f87171" stroke-width="1.5"/>`; }).join('');
      $('#fsvg', el).innerHTML = `<path d="M30 200H300M30 200V10" stroke="#CBD5E1"/>${resid}<line x1="${X(0)}" y1="${Y(b)}" x2="${X(11)}" y2="${Y(m * 11 + b)}" stroke="#08805A" stroke-width="3"/>${PTS.map(([x, y]) => `<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="#0F172A"/>`).join('')}`;
      $('#fmse', el).innerHTML = `MSE = <b>${(se / PTS.length).toFixed(2)}</b> <span style="color:#dc2626">(red lines = errors)</span>`;
    };
    $('#fs', el).addEventListener('input', draw); $('#fi', el).addEventListener('input', draw);
    $('#fbest', el).addEventListener('click', () => { const n = PTS.length, mx = 5.5, my = PTS.reduce((a, p) => a + p[1], 0) / n; const m = PTS.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / PTS.reduce((a, p) => a + (p[0] - mx) ** 2, 0); $('#fs', el).value = m; $('#fi', el).value = my - m * mx; draw(); });
    draw();
  }
  const SAMPLE = 'Learners can request a full refund within 14 days of the programme start date provided they have attended fewer than three live sessions. After 14 days no refund is available but learners may transfer their seat once free of charge. Refund requests must be submitted through the support portal.';
  function chunkWidget(el) {
    el.innerHTML = `<h5>TRY IT: SEE CHUNKING</h5><div class="ctl"><label>Chunk size (words) <span class="rv" id="cz-v">12</span></label><input type="range" id="cz" min="5" max="45" value="12"><label>Overlap (words) <span class="rv" id="co-v">3</span></label><input type="range" id="co" min="0" max="10" value="3"></div><p id="cview" style="line-height:2.2;font-size:14px;margin-top:12px"></p><div class="note" id="cnote"></div>`;
    const colors = ['#d1fae5', '#bfdbfe', '#fde68a', '#fbcfe8', '#ddd6fe', '#fed7aa'];
    const draw = () => {
      const size = +$('#cz', el).value, ov = Math.min(+$('#co', el).value, size - 1); $('#cz-v', el).textContent = size; $('#co-v', el).textContent = ov;
      const w = SAMPLE.split(' '), step = size - ov; const marks = Array.from({ length: w.length }, () => []); let n = 0;
      for (let s = 0; s < w.length; s += step) { for (let i = s; i < Math.min(w.length, s + size); i++) marks[i].push(n); n++; if (s + size >= w.length) break; }
      $('#cview', el).innerHTML = w.map((x, i) => { const m = marks[i]; return `<span style="background:${colors[m[m.length - 1] % 6]};padding:2px 3px;border-radius:4px;${m.length > 1 ? 'outline:2px solid #08805A;' : ''}">${esc(x)}</span>`; }).join(' ');
      $('#cnote', el).textContent = `${n} chunks. Outlined words appear in two chunks (overlap).`;
    };
    $('#cz', el).addEventListener('input', draw); $('#co', el).addEventListener('input', draw); draw();
  }
  function loopWidget(el) {
    const st = [['👀 Perceive', 'Read the customer message'], ['🧠 Decide', 'Pick the next tool'], ['🛠 Act', 'Call the tool with typed inputs'], ['🔎 Observe', 'Read the tool result']];
    el.innerHTML = `<h5>TRY IT: THE AGENT LOOP</h5><div class="flow" id="lw">${st.map((s, i) => `${i ? '<i>→</i>' : ''}<span data-i="${i}">${s[0]}</span>`).join('')}<i>↺</i></div><p id="lt" class="note"></p><button class="btn sm soft" id="ls" type="button">Next step</button>`;
    let i = -1; $('#ls', el).addEventListener('click', () => { i = (i + 1) % 4; $$('#lw span', el).forEach((s, j) => { s.style.background = j === i ? '#08805A' : ''; s.style.color = j === i ? '#fff' : ''; }); $('#lt', el).textContent = `${st[i][0]}: ${st[i][1]}. ${i === 3 ? 'Loop again until the goal is met or a limit or approval gate stops it.' : ''}`; });
  }
  const WIDGETS = { 'fit-line': fitWidget, 'chunk-viz': chunkWidget, 'agent-loop': loopWidget };

  /* ---------- experiments ---------- */
  function resultTable(r) {
    return `<div style="margin:10px 0">${modeBadge(r.execution?.mode || 'real')} <span class="note">${esc(r.execution?.note || '')}</span></div><div class="tbl-wrap"><table class="t"><thead><tr>${r.columns.map((c) => `<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row) => `<tr>${r.columns.map((c) => `<td>${esc(row[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------- render ---------- */
  function build() {
    const m = G.mission; const prefix = P.id === 'ml-model-builder' ? 'ml' : P.id === 'pdf-chatbot' ? 'rag' : 'agent';
    let h = `<div class="unlocked-banner"><div><b>✓ Project unlocked.</b> Your progress is saved automatically. No second registration needed.</div><div style="display:flex;gap:10px"><button class="btn sm" style="background:#fff;color:var(--green)" id="printBtn">⬇ Printable handout</button></div></div>`;
    h += sec('s-mission', '01', 'Objective', `<div class="mission"><h3>MISSION OVERVIEW</h3><p style="font-size:17px">${esc(m.problem)}</p><p style="color:#a7f3d0">${esc(m.build)}</p><div class="stats">${m.stats.map(([a, b]) => `<div class="stat"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div></div><p style="margin-top:20px;font-size:16px">${G.objective.map(esc).join(' ')}</p>`);
    h += sec('s-prereq', '02', 'Prerequisites', `<ul class="check-list">${G.prerequisites.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`);
    h += sec('s-concepts', '', 'Concept Explorer', G.concepts.map((c, i) => `<details class="acc" ${i === 0 ? 'open' : ''}><summary>${esc(c.title)} <span class="note" style="font-weight:400">${esc(c.summary)}</span></summary><div class="in"><p>${esc(c.detail)}</p><div class="example"><b>Real-world example:</b> ${esc(c.example)}</div>${c.widget ? `<div class="widget" data-widget="${c.widget}"></div>` : ''}</div></details>`).join(''));
    h += sec('s-arch', '', 'Architecture Explorer', `<p>Select any component to see what it does, then play the data flow.</p>${archHtml()}`);
    h += sec('s-tools', '03', 'Tools', `<div class="chips" id="techchips">${G.tools.map((t, i) => `<button class="chip" data-i="${i}" aria-pressed="false">${esc(t.name)}</button>`).join('')}</div><div class="tech-detail" id="techdetail"></div>`);
    h += sec('s-steps', '04', 'Steps', `<p>${G.steps.length} sequential steps. Open each, then tick the checkpoint when you have done it.</p>` + G.steps.map((s, i) => `<article class="step-card" data-i="${i}"><div class="step-head" role="button" tabindex="0" aria-expanded="false"><span class="num">${i + 1}</span><h3>${esc(s.title)}<div class="obj">${esc(s.objective)}</div></h3></div><div class="step-body"><p>${esc(s.explanation)}</p><h5>VISUAL</h5>${flowHtml(s.visual.flow)}<h5>CODE</h5>${codeBlock(s.code)}<h5>EXPECTED OUTPUT</h5><div class="expect">${esc(s.expected)}</div><h5>COMMON MISTAKES</h5><ul class="mistakes">${s.mistakes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><label class="checkpoint"><input type="checkbox" data-step="${i}"> <span><b>Checkpoint:</b> ${esc(s.checkpoint)}</span></label></div></article>`).join(''));
    h += sec('s-lab', '', 'Project Lab', `<div id="lab-root"></div>`);
    h += sec('s-exp', '', 'Interactive Experiments', `<p>Real runs, not canned screenshots. Change something and observe what happens.</p><div class="row3" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${G.experiments.map((x) => `<div class="panel" data-exp="${x.id}"><h3 style="font-size:16px">${esc(x.title)}</h3><p style="font-size:14px;color:var(--muted)">${esc(x.desc)}</p><button class="btn sm" data-run="${x.id}">${esc(x.button)}</button><div class="exp-out"></div></div>`).join('')}</div>`);
    h += sec('s-result', '05', 'Expected Result', `<div class="row2"><div><div class="video" id="resvideo" role="img" aria-label="Animated walkthrough of the finished project"></div><p class="note" style="margin-top:8px">Animated walkthrough of the pipeline. A recorded 30 to 60 second demo video can be added through the content file (<code>demoVideoUrl</code>).</p></div><div class="panel"><h2 style="font-size:18px">When you finish, you will have</h2><ul class="check-list">${G.expected.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`);
    h += sec('s-checks', '', 'Knowledge Checkpoints', G.checks.map((c, i) => `<div class="q-card" data-check="${c.id}"><div class="kind">${esc(c.kind.toUpperCase())} · ${i + 1}/${G.checks.length}</div><p style="font-weight:600;margin:6px 0">${esc(c.q)}</p>${c.code ? `${codeBlock({ lang: 'python', text: c.code })}` : ''}${c.options.map((o, j) => `<label class="opt"><input type="radio" name="chk-${c.id}" value="${j}"> ${esc(o)}</label>`).join('')}<button class="btn sm" data-check-btn="${c.id}">Check answer</button><div class="fb-slot"></div></div>`).join(''));
    h += sec('s-challenge', '', 'Final Challenge', `<div class="panel"><h3>${esc(G.challenge.title)}</h3><p>${esc(G.challenge.brief)}</p><ul class="crit" id="critlist">${G.challenge.criteria.map((c) => `<li data-crit="${esc(c)}">${esc(c)}</li>`).join('')}</ul><button class="btn sm soft" id="critRefresh">Re-check my lab activity</button><p class="note" style="margin-top:10px">Verified on the server from the runs you perform in the Project Lab. It cannot be ticked manually.</p></div>`);
    h += sec('s-quiz', '', 'Assessment', `<p>Score at least <b>${ST.passMark}%</b> to pass. You may retry. Correct answers are not revealed, but wrong questions are highlighted.</p><div id="quizbox">${G.quiz.map((q, i) => `<div class="q-card" data-q="${i}"><div class="kind">QUESTION ${i + 1}/${G.quiz.length}</div><p style="font-weight:600;margin:6px 0">${esc(q.q)}</p>${q.options.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join('')}</div>`).join('')}</div><button class="btn" id="quizBtn">Submit assessment</button> <span id="quizRes" style="margin-left:12px;font-weight:600"></span>`);
    h += sec('s-outcomes', '', 'Learning Outcomes', `<div class="outcome-grid">${G.outcomes.map((x) => `<div class="outcome"><span class="avatar" style="width:30px;height:30px;font-size:13px">✓</span>${esc(x)}</div>`).join('')}</div><h3 style="margin:28px 0 12px;font-size:18px">Your next learning path</h3><div class="path">${G.learningPath.map((p) => `<div><b>${esc(p.label)}</b>${esc(p.desc)}</div>`).join('')}</div>`);
    h += sec('s-cert', '', 'Certificate', `<div id="certbox"></div>`);
    h += sec('s-share', '06', 'Share Your Project', `<div class="li-card"><p style="font-size:14px;color:var(--muted)">A prefilled post. Edit it, copy it, then open LinkedIn.</p><textarea class="li-text" id="litext" aria-label="LinkedIn post text"></textarea><div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn" id="liCopy">Copy post</button><a class="btn ghost" id="liOpen" target="_blank" rel="noopener">Share on LinkedIn</a></div><p class="note" style="margin-top:8px">LinkedIn only accepts a link when sharing; paste your copied text into the post box.</p></div>`);
    const pr = P.programme;
    h += sec('s-prog', '07', 'Related Programme', `<div class="prog-card"><div class="prog-head"><span class="eyebrow" style="margin-bottom:10px">CERTIFICATION PROGRAMME</span><h3>${esc(pr.name)}</h3><div class="facts"><span>⏱ ${esc(pr.duration)}</span><span>🎓 ${esc(pr.mode)}</span></div></div><div class="prog-body"><div class="hl">${pr.highlights.map((x) => `<div><span style="color:var(--green)">✔</span>${esc(x)}</div>`).join('')}</div><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="/go/${pr.slug}?project=${P.id}&intent=enroll">Enroll Now</a><a class="btn ghost" href="/go/${pr.slug}?project=${P.id}&intent=syllabus">View Syllabus</a></div></div></div>`);
    return h;
  }

  /* ---------- status application ---------- */
  function applyStatus(st) {
    ST = st; const c = st.counts;
    $('#pbar').style.width = st.percent + '%'; $('#ptxt').textContent = `${st.percent}% complete · ${c.stepsDone}/${c.steps} steps · ${c.msDone}/${c.ms} lab milestones`;
    $$('.step-card').forEach((el) => { const d = !!st.steps[el.dataset.i]; el.classList.toggle('done', d); el.querySelector('input').checked = d; });
    $$('[data-check]').forEach((el) => el.classList.toggle('pass', !!st.checks[el.dataset.check]));
    $$('[data-crit]').forEach((li) => li.classList.toggle('ok', !!st.challenge[li.dataset.crit]));
    const done = { steps: st.gates.steps, milestones: st.gates.milestones, checks: st.gates.checks, challenge: st.gates.challenge, quiz: st.gates.quiz, cert: !!st.certificate };
    $$('.side a[data-key]').forEach((a) => a.classList.toggle('done', !!done[a.dataset.key]));
    renderCert(); if (labCtx && labCtx.onStatus) labCtx.onStatus(st);
  }
  function renderCert() {
    const st = ST; const box = $('#certbox'); if (!box) return;
    const gate = (ok, label) => `<div class="gate-i ${ok ? 'ok' : ''}"><b>${ok ? '✔' : '○'}</b> ${esc(label)}</div>`;
    const c = st.counts;
    const gates = `<div class="gates">${gate(st.gates.steps, `Guide checkpoints ${c.stepsDone}/${c.steps}`)}${gate(st.gates.checks, `Knowledge checks ${c.checksDone}/${c.checks}`)}${gate(st.gates.milestones, `Lab milestones ${c.msDone}/${c.ms}`)}${gate(st.gates.challenge, 'Final challenge')}${gate(st.gates.quiz, `Assessment ≥ ${st.passMark}% (best ${st.quiz.best}%)`)}</div>`;
    if (st.certificate) {
      const id = st.certificate.id;
      box.innerHTML = `<div class="cert-box"><div style="font-size:42px">🏆</div><h3>Certificate issued</h3><p>Certificate ID <b>${esc(id)}</b><br>Issued ${fmtDate(st.certificate.issued_at)}</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn" href="/certificate/${esc(id)}" target="_blank">View / download certificate</a><a class="btn ghost" href="/verify/${esc(id)}" target="_blank">Verification page</a></div></div>`;
    } else {
      box.innerHTML = `<div class="panel"><p>Certificates are issued only after <b>validated</b> completion: every requirement below must be met. Registering or opening the guide is not enough.</p>${gates}<label class="consent"><input type="checkbox" id="showcase"> <span>Feature my first name and project in the public learner showcase (optional).</span></label><button class="btn" id="claimBtn" ${st.eligible ? '' : 'disabled'}>Claim my certificate</button></div>`;
      $('#claimBtn').addEventListener('click', (e) => busy(e.currentTarget, async () => {
        try { await api(`/api/projects/${P.id}/certificate`, { showcase: $('#showcase').checked }); toast('Certificate issued! 🎉'); await refresh(); updateShare(); $('#s-cert').scrollIntoView(); }
        catch (err) { toast(err.message); }
      }));
    }
  }
  async function refresh() { const r = await api(`/api/projects/${P.id}/status`); applyStatus(r.status); return r.status; }
  function updateShare() {
    const link = `${location.origin}/project/${P.id}`; const cert = ST.certificate ? `\nVerified certificate: ${location.origin}/verify/${ST.certificate.id}` : '';
    $('#litext').value = `${G.share.text}\n\nProject: ${P.title}\nTry it: ${link}${cert}\n\n${G.share.hashtags.join(' ')}`;
    $('#liOpen').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(ST.certificate ? `${location.origin}/verify/${ST.certificate.id}` : link);
  }

  function wire() {
    $$('[data-widget]').forEach((el) => WIDGETS[el.dataset.widget]?.(el));
    $$('.arch-node').forEach((b) => b.addEventListener('click', () => selectArch(+b.dataset.i))); selectArch(0);
    $('#archplay').addEventListener('click', () => { const nodes = $$('.arch-node'); let i = 0; clearInterval(wire._t); wire._t = setInterval(() => { nodes.forEach((n) => n.classList.remove('pulse')); if (i >= nodes.length) return clearInterval(wire._t); nodes[i].classList.add('pulse'); selectArch(i); i++; }, 900); });
    const showTech = (i) => { const t = G.tools[i]; $$('#techchips .chip').forEach((c, j) => c.setAttribute('aria-pressed', i === j)); $('#techdetail').innerHTML = `<b>Name</b><span>${esc(t.name)}</span><b>Type</b><span>${esc(t.kind)}</span><b>Role here</b><span>${esc(t.role)}</span><b>Why it is used</b><span>${esc(t.why)}</span>`; };
    $$('#techchips .chip').forEach((c) => c.addEventListener('click', () => showTech(+c.dataset.i))); showTech(0);
    $$('.step-head').forEach((hd) => { const tg = () => { const card = hd.parentElement; const o = card.classList.toggle('open'); hd.setAttribute('aria-expanded', o); }; hd.addEventListener('click', tg); hd.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tg(); } }); });
    $$('.step-card')[0].classList.add('open');
    $$('input[data-step]').forEach((cb) => cb.addEventListener('change', async () => { try { const r = await api(`/api/projects/${P.id}/step`, { idx: +cb.dataset.step, done: cb.checked }); applyStatus(r.status); if (cb.checked) toast('Checkpoint saved ✓'); } catch (e) { cb.checked = !cb.checked; toast(e.message); } }));
    $$('[data-run]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
      const out = b.parentElement.querySelector('.exp-out');
      try { const body = { id: b.dataset.run }; if (labCtx.features) body.features = labCtx.features(); const r = await api(labCtx.expUrl, body); out.innerHTML = resultTable(r); } catch (e) { out.innerHTML = `<div class="form-err">${esc(e.message)}</div>`; }
    })));
    $$('[data-check-btn]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
      const card = b.closest('[data-check]'); const sel = card.querySelector('input:checked'); const slot = card.querySelector('.fb-slot');
      if (!sel) { slot.innerHTML = '<div class="fb no">Pick an answer first.</div>'; return; }
      try { const r = await api(`/api/projects/${P.id}/check`, { id: card.dataset.check, choice: +sel.value }); slot.innerHTML = `<div class="fb ${r.correct ? 'ok' : 'no'}">${r.correct ? '✔ Correct. ' : ''}${esc(r.explain)}</div>`; applyStatus(r.status); } catch (e) { toast(e.message); }
    })));
    $('#critRefresh').addEventListener('click', (e) => busy(e.currentTarget, async () => { await refresh(); toast('Re-checked against your lab activity'); }));
    $('#quizBtn').addEventListener('click', (e) => busy(e.currentTarget, async () => {
      const answers = G.quiz.map((_, i) => { const s = $(`input[name=q${i}]:checked`); return s ? +s.value : -1; });
      if (answers.includes(-1)) { toast('Please answer every question'); return; }
      try {
        const r = await api(`/api/projects/${P.id}/quiz`, { answers });
        $$('[data-q]').forEach((c, i) => { c.classList.toggle('pass', r.results[i]); c.querySelectorAll('.opt').forEach((o) => o.classList.remove('bad')); if (!r.results[i]) c.querySelector('input:checked').closest('.opt').classList.add('bad'); });
        $('#quizRes').innerHTML = r.passed ? `<span style="color:var(--green)">✔ Passed with ${r.score}%</span>` : `<span style="color:var(--red)">${r.score}%. You need ${ST.passMark}%. Review the highlighted questions and retry.</span>`;
        applyStatus(r.status);
      } catch (err) { toast(err.message); }
    }));
    $('#liCopy').addEventListener('click', () => { navigator.clipboard?.writeText($('#litext').value); toast('Post copied. Paste it into LinkedIn.'); });
    $('#printBtn').addEventListener('click', () => { $$('details.acc').forEach((d) => (d.open = true)); window.print(); });
    // side nav: scroll spy
    const links = $$('.side a[data-sec]'); const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.dataset.sec === e.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
    $$('.ws-main section').forEach((s) => io.observe(s));
    links.forEach((a) => a.addEventListener('click', () => $('.side').classList.remove('open')));
    walkthrough($('#resvideo'));
  }
  function walkthrough(el) {
    const n = G.architecture.nodes; el.innerHTML = `<div style="padding:24px;text-align:center"><div class="note" style="color:#6ee7b7;letter-spacing:.12em;margin-bottom:14px">${esc(P.title.toUpperCase())}</div><div class="flow" id="vf" style="justify-content:center">${n.map((x, i) => `${i ? '<i style="color:#6ee7b7">→</i>' : ''}<span style="background:#0d3b30;border-color:#34d399;color:#d1fae5" data-i="${i}">${esc(x.label)}</span>`).join('')}</div><p id="vc" style="margin-top:14px;font-size:14px;color:#cbd5e1"></p></div><span class="tag">Animated walkthrough</span>`;
    let i = 0; const spans = $$('#vf span', el); setInterval(() => { spans.forEach((s, j) => { s.style.background = j === i ? '#10b981' : '#0d3b30'; s.style.color = j === i ? '#052e24' : '#d1fae5'; }); $('#vc', el).textContent = n[i].desc; i = (i + 1) % n.length; }, 1800);
  }

  function render(root, { project, guide, status, ctxFactory }) {
    ROOT = root; G = guide; P = project; ST = status;
    root.innerHTML = `<div class="wrap"><button class="btn sm soft side-toggle" id="sideToggle">☰ Sections</button><div class="ws"><aside class="side" aria-label="Guide sections">${sideHtml()}</aside><div class="ws-main">${build()}</div></div></div>`;
    $('#sideToggle').addEventListener('click', () => $('.side').classList.toggle('open'));
    labCtx = ctxFactory({ refresh, getStatus: () => ST, guide: G });
    wire(); labCtx.mount($('#lab-root')); applyStatus(status); updateShare();
  }
  return { render, refresh };
})();
