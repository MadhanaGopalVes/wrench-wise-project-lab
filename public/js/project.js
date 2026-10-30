/* Project page: hero + registration gate (before) → unlocked handout workspace (after). */
renderNav(true);
const PID = location.pathname.split('/').pop();
const app = $('#app');
let PROJECT, LEARNER;

function metaChips(p) {
  const diff = ['Beginner', 'Moderate', 'Expert'].includes(p.difficulty) ? p.difficulty : 'all';
  return `<div class="meta" style="margin:14px 0"><span class="pill">${esc(p.categoryLabel)}</span><span class="pill ${diff}">${esc(p.difficulty)}</span><span class="pill dark">⏱ ${esc(p.time)} build time</span></div>`;
}
function heroLeft(p) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Projects</a><span>›</span><a href="/">${esc(p.categoryLabel)}</a><span>›</span>${esc(p.title)}</nav>
  <div style="margin-top:22px"><span class="eyebrow">FREE PROJECT GUIDE · ${esc(p.lab)}</span><h1>${esc(p.title)}</h1><p class="lead">${esc(p.tagline)} ${esc(p.summary)}</p>${metaChips(p)}<span class="demo-badge">▶ Demo walkthrough included</span></div>`;
}
function gateCard(p) {
  const soon = p.status !== 'live';
  return `<aside class="gate" aria-labelledby="gate-h"><h2 id="gate-h">${soon ? 'Get notified at launch' : 'Unlock this project'}</h2><p class="sub">${soon ? 'This project is being built. Register to be first in line.' : 'Free. One registration unlocks the full guide, the live lab and your certificate.'}</p>
  <form id="regForm" novalidate>
    <div class="field"><label for="f-name">Full Name</label><input id="f-name" name="name" autocomplete="name" required maxlength="80"><div class="err" data-err="name"></div></div>
    <div class="field"><label for="f-email">Email Address</label><input id="f-email" name="email" type="email" autocomplete="email" required><div class="err" data-err="email"></div></div>
    <div class="field"><label for="f-phone">Phone Number</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" placeholder="+91 98765 43210" required><div class="err" data-err="phone"></div></div>
    <label class="consent"><input type="checkbox" id="f-consent"><span>I agree that Wrench Wise stores my name, email and phone to unlock this project, track my progress and issue my certificate. <a href="#privacy" id="privLink">Privacy details</a></span></label><div class="err" data-err="consent" style="color:var(--red);font-size:12px;margin:-6px 0 8px"></div>
    <label class="consent"><input type="checkbox" id="f-mkt"><span>(Optional) Send me information about Wrench Wise programmes. You can opt out any time.</span></label>
    <div id="formErr"></div>
    <button class="btn block" type="submit" id="regBtn">${soon ? 'Notify Me' : 'Unlock Project'}</button>
  </form>
  <div id="privacy" class="note" hidden style="margin-top:12px;background:var(--bg);padding:10px 12px;border-radius:10px">We use your details only for this learning experience, your certificate and (if you opted in) programme updates. Lab exercises use synthetic data. Documents you upload to the PDF lab are processed for your session. You can delete your account and data from this page after unlocking.</div>
  <div class="trust"><span>🔒 No payment needed</span><span>🎓 Certificate on completion</span><span>⚡ Instant access</span></div></aside>`;
}
function previewBody(p) {
  return `<div class="wrap pre-grid"><div>
    <div class="panel"><h2>Project overview</h2><p style="font-size:16px">${esc(p.overview || p.summary)}</p><p><b>Final outcome:</b> ${esc(p.outcome)}</p></div>
    <div class="panel" style="margin-top:24px"><h2>Expected outcome preview</h2><div class="preview-media"><div class="thumb" style="aspect-ratio:auto;height:100%">${thumbSvg(p)}</div></div><p class="note" style="margin-top:8px">Illustrative preview. The real thing is a working lab you operate after unlocking.</p></div>
    ${p.architecturePreview.length ? `<div class="panel" style="margin-top:24px"><h2>The pipeline you will build</h2><div class="arch-mini">${p.architecturePreview.map((x, i) => `${i ? '<i>→</i>' : ''}<span class="node">${esc(x)}</span>`).join('')}</div></div>` : ''}
  </div><div>
    ${p.inside ? `<div class="panel"><h2>What’s inside this guide</h2><ul class="check-list">${p.inside.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${p.sections.length ? `<div class="panel" style="margin-top:24px"><h2>Unlocks after registration</h2><div class="sec-preview">${p.sections.map((s) => `<div class="sec-row"><span class="no">${s.n}</span><div><b>${esc(s.title)}</b><small>${esc(s.teaser)}</small></div><span class="lock" aria-hidden="true">🔒</span></div>`).join('')}</div>${p.handout ? `<p class="note" style="margin-top:14px">Includes ${p.handout.steps} build steps, ${p.handout.experiments} live experiments, ${p.handout.checks} knowledge checkpoints and a ${p.handout.quiz}-question assessment.</p>` : ''}<button class="btn block" id="scrollGate" style="margin-top:12px">Register to unlock</button></div>` : `<div class="panel"><h2>Coming soon</h2><p>This project uses the same interactive engine as the live labs. Join the waitlist and we will tell you when it opens.</p></div>`}
  </div></div>`;
}

function validate() {
  const e = {}; const v = (id) => $(id).value.trim();
  if (v('#f-name').length < 2) e.name = 'Please enter your full name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('#f-email'))) e.email = 'Please enter a valid email address';
  const d = v('#f-phone').replace(/\D/g, ''); if (d.length < 8 || d.length > 15) e.phone = 'Please enter a valid phone number';
  if (!$('#f-consent').checked) e.consent = 'Please accept to continue';
  $$('[data-err]').forEach((x) => (x.textContent = e[x.dataset.err] || '')); return !Object.keys(e).length;
}
function wireForm() {
  $('#privLink').addEventListener('click', (e) => { e.preventDefault(); $('#privacy').hidden = !$('#privacy').hidden; });
  $('#regForm').addEventListener('submit', async (ev) => {
    ev.preventDefault(); $('#formErr').innerHTML = ''; if (!validate()) return;
    await busy($('#regBtn'), async () => {
      try {
        const r = await api('/api/register', { name: $('#f-name').value, email: $('#f-email').value, phone: $('#f-phone').value, consent: true, marketing: $('#f-mkt').checked, projectId: PID, source: new URLSearchParams(location.search).get('utm_source') || 'project-lab' });
        LEARNER = r.learner;
        if (r.waitlisted) { $('#regForm').innerHTML = '<div class="fb ok">✔ You are on the list. We will email you when this project launches.</div>'; return; }
        toast(r.returning ? 'Welcome back! Your progress is restored.' : 'Unlocked! 🎉'); await openWorkspace(); scrollTo({ top: 0 });
        if (LEARNER && LEARNER.name) $('#who').innerHTML = `Hi, ${esc(LEARNER.name.split(' ')[0])}`;
      } catch (e) { if (e.data && e.data.field) { const el = $(`[data-err=${e.data.field}]`); if (el) el.textContent = e.message; } else $('#formErr').innerHTML = `<div class="form-err">${esc(e.message)}</div>`; }
    });
  });
  const sg = $('#scrollGate'); if (sg) sg.addEventListener('click', () => { $('#f-name').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#f-name').focus({ preventScroll: true }); });
}

function showPrivacyTools() {
  const el = document.createElement('div'); el.className = 'wrap'; el.innerHTML = `<div class="panel" style="margin:0 auto 20px"><b>Your data</b> · <button class="link" id="delAcct">Delete my account and data</button> <span class="note">(also removes any certificates)</span></div>`;
  app.append(el); $('#delAcct').addEventListener('click', async () => { if (!confirm('Delete your account, progress and certificates? This cannot be undone.')) return; await api('/api/me/delete', { confirm: 'DELETE' }); location.href = '/'; });
}

async function openWorkspace() {
  const { guide, status, ai } = await api(`/api/projects/${PID}/guide`);
  document.title = `${PROJECT.title} · Free Project Guide | Wrench Wise`;
  app.innerHTML = `<section class="p-hero"><div class="wrap" style="grid-template-columns:1fr">${heroLeft(PROJECT)}</div></section><div id="ws"></div>`;
  Handout.render($('#ws'), { project: PROJECT, guide, status, ctxFactory: (base) => { const lab = Labs[PID](base); return lab; } });
  showPrivacyTools();
}

(async () => {
  try {
    const r = await api('/api/projects/' + PID); PROJECT = r.project; LEARNER = r.learner;
    document.title = `${PROJECT.title} · Free Project Guide | Wrench Wise`;
    document.querySelector('meta[name=description]').content = `${PROJECT.summary} Free interactive project guide from Wrench Wise.`;
    api('/api/event', { type: 'project_viewed', projectId: PID, anon: anonId() }).catch(() => {});
    if (r.unlocked) return await openWorkspace();
    app.innerHTML = `<section class="p-hero"><div class="wrap">${`<div>${heroLeft(PROJECT)}</div>`}${gateCard(PROJECT)}</div></section>${previewBody(PROJECT)}`;
    wireForm();
    if (LEARNER && PROJECT.status !== 'live') { $('#f-name').value = LEARNER.name; $('#f-email').value = LEARNER.email; }
  } catch (e) {
    app.innerHTML = `<div class="wrap" style="padding:80px 0;text-align:center"><h1>Project not found</h1><p>${esc(e.message)}</p><a class="btn" href="/">Back to projects</a></div>`;
  }
  renderFooter();
})();
