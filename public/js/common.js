/* Shared helpers: API client, nav/footer, thumbnails, syntax highlighting, toast. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, body, method, extraHeaders = {}) {
  const opts = { method: method || (body === undefined ? 'GET' : 'POST'), headers: { ...extraHeaders }, credentials: 'same-origin' };
  if (body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res; try { res = await fetch(path, opts); } catch { throw Object.assign(new Error('Network error. Check your connection.'), { status: 0 }); }
  let data = {}; try { data = await res.json(); } catch { /* non-json */ }
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  return data;
}

function toast(msg, ms = 3200) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms);
}
const busy = async (btn, fn) => { const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Working…'; try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; } };
const anonId = () => { let a = localStorage.getItem('ww_anon'); if (!a) { a = 'a' + Math.random().toString(36).slice(2, 12); localStorage.setItem('ww_anon', a); } return a; };
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const WRENCH = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3.5 17.2a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.1-5.4l-2.4 2.4-2.1-.5-.5-2.1z"/></svg>';
function renderNav(active) {
  const links = [['All Courses', '#'], ['For Business', '#'], ['Wise-Sessions', '#'], ['Projects', '/'], ['About Us', '#'], ['Books', '#'], ['Wise Library', '#']];
  document.body.insertAdjacentHTML('afterbegin', `<header class="nav"><div class="wrap">
    <a class="logo" href="/" aria-label="Wrench Wise Project Lab home"><i>${WRENCH}</i><span>Wrench <b>Wise</b></span></a>
    <nav class="nav-links" id="navlinks" aria-label="Main">${links.map(([l, h]) => `<a href="${h}" ${l === 'Projects' && active ? 'class="on" aria-current="page"' : ''} ${h === '#' ? 'data-offsite="1"' : ''}>${l}</a>`).join('')}</nav>
    <div class="who" id="who"></div><button class="burger" id="burger" aria-label="Menu" aria-expanded="false">☰</button></div></header>`);
  $('#burger').addEventListener('click', (e) => { const o = $('#navlinks').classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); });
  $$('[data-offsite]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast('This link points to the main Wrench Wise website, which is still being built.'); }));
  api('/api/me').then((m) => { if (m.learner && m.learner.name) $('#who').innerHTML = `Hi, ${esc(m.learner.name.split(' ')[0])} <button class="link" id="logout">Sign out</button>`, $('#logout').addEventListener('click', async () => { await api('/api/logout', {}); location.href = '/'; }); }).catch(() => {});
}
function renderFooter() {
  document.body.insertAdjacentHTML('beforeend', `<footer><div class="wrap cols"><div><div class="logo" style="color:#fff"><i>${WRENCH}</i><span>Wrench <b style="color:#6ee7b7">Wise</b></span></div><p style="margin-top:10px;max-width:360px">Wrench Wise Project Lab. Explore. Experiment. Build. Achieve.</p></div>
  <div><b>Your data</b><p class="note" style="color:#94A3B8;max-width:380px">We store your name, email, phone and project progress to unlock your guide and issue your certificate. You can erase your data any time from your project page. Learning exercises use synthetic data only.</p></div></div></footer>`);
}

/* ---------- generated 16:9 thumbnails (1200x675 viewBox) ---------- */
const THUMB = { ml: ['#064e3b', '#10b981', '#d1fae5'], genai: ['#0c4a6e', '#0ea5e9', '#e0f2fe'], agentic: ['#4c1d95', '#8b5cf6', '#ede9fe'] };
const ICONS = {
  chart: '<path d="M300 480h600M300 480V230" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/><g fill="#fff"><circle cx="400" cy="400" r="16"/><circle cx="470" cy="380" r="16"/><circle cx="560" cy="330" r="16"/><circle cx="640" cy="340" r="16"/><circle cx="730" cy="280" r="16"/><circle cx="820" cy="250" r="16"/></g><path d="M360 430L860 230" stroke="#fde68a" stroke-width="8" stroke-dasharray="4 18" stroke-linecap="round"/>',
  doc: '<rect x="400" y="170" width="280" height="340" rx="24" fill="#fff"/><g stroke="currentColor" stroke-width="12" stroke-linecap="round" opacity=".5"><path d="M450 250h180M450 300h180M450 350h120"/></g><circle cx="740" cy="420" r="70" fill="none" stroke="#fff" stroke-width="14"/><path d="M790 470l70 70" stroke="#fff" stroke-width="16" stroke-linecap="round"/>',
  bot: '<rect x="400" y="220" width="400" height="270" rx="60" fill="#fff"/><circle cx="520" cy="340" r="32" fill="currentColor"/><circle cx="680" cy="340" r="32" fill="currentColor"/><path d="M540 420q60 40 120 0" stroke="currentColor" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M600 220v-60" stroke="#fff" stroke-width="12"/><circle cx="600" cy="145" r="22" fill="#fde68a"/>',
  users: '<g fill="#fff"><circle cx="500" cy="280" r="60"/><circle cx="700" cy="280" r="60"/><path d="M380 480q0-110 120-110t120 110zM580 480q0-110 120-110t120 110z"/></g>',
  image: '<rect x="360" y="190" width="480" height="320" rx="30" fill="#fff"/><circle cx="480" cy="290" r="38" fill="#fde68a"/><path d="M380 500l170-170 120 120 60-60 110 110z" fill="currentColor" opacity=".6"/>',
  star: '<path d="M600 170l62 126 139 20-100 98 24 138-125-66-125 66 24-138-100-98 139-20z" fill="#fff"/>',
  db: '<g fill="#fff"><ellipse cx="600" cy="230" rx="170" ry="60"/><path d="M430 250v110c0 33 76 60 170 60s170-27 170-60V250c0 33-76 60-170 60s-170-27-170-60z"/><path d="M430 390v90c0 33 76 60 170 60s170-27 170-60v-90c0 33-76 60-170 60s-170-27-170-60z"/></g>',
  scan: '<rect x="420" y="180" width="360" height="330" rx="24" fill="#fff"/><path d="M360 300v-90a30 30 0 0 1 30-30h90M840 300v-90a30 30 0 0 0-30-30h-90M360 400v90a30 30 0 0 0 30 30h90M840 400v90a30 30 0 0 1-30 30h-90" stroke="#fde68a" stroke-width="12" fill="none" stroke-linecap="round"/>',
  team: '<g fill="#fff"><circle cx="600" cy="230" r="55"/><circle cx="440" cy="400" r="48"/><circle cx="760" cy="400" r="48"/></g><path d="M600 290L470 360M600 290l130 70M490 410h220" stroke="#fde68a" stroke-width="8" stroke-dasharray="4 14" stroke-linecap="round"/>',
  receipt: '<path d="M440 170h320v350l-40-30-40 30-40-30-40 30-40-30-40 30-40-30z" fill="#fff"/><g stroke="currentColor" stroke-width="12" opacity=".5" stroke-linecap="round"><path d="M490 250h220M490 310h220M490 370h120"/></g>',
  flow: '<g fill="#fff"><rect x="330" y="290" width="140" height="100" rx="24"/><rect x="530" y="190" width="140" height="100" rx="24"/><rect x="530" y="390" width="140" height="100" rx="24"/><rect x="730" y="290" width="140" height="100" rx="24"/></g><path d="M470 340h20l40-100M470 340h20l40 100M670 240h20l40 100M670 440h20l40-100" stroke="#fde68a" stroke-width="8" fill="none" stroke-linecap="round"/>',
};
function thumbSvg(p, labelOverlay = true) {
  const [d, m, l] = THUMB[p.category] || THUMB.ml; const id = 'g' + p.id.replace(/[^a-z]/g, '');
  return `<svg viewBox="0 0 1200 675" role="img" aria-label="${esc(p.title)} illustration" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${d}"/><stop offset="1" stop-color="${m}"/></linearGradient></defs>
  <rect width="1200" height="675" fill="url(#${id})"/><g opacity=".12" stroke="#fff"><path d="M0 120h1200M0 240h1200M0 360h1200M0 480h1200M0 600h1200M150 0v675M300 0v675M450 0v675M600 0v675M750 0v675M900 0v675M1050 0v675"/></g>
  <circle cx="1020" cy="130" r="150" fill="#fff" opacity=".08"/><circle cx="150" cy="580" r="190" fill="#fff" opacity=".07"/>
  <g color="${m}" transform="translate(0,-10)">${ICONS[p.icon] || ICONS.chart}</g>
  ${labelOverlay ? `<text x="56" y="620" fill="${l}" font-family="Poppins,sans-serif" font-weight="700" font-size="34" letter-spacing="4">${esc(p.lab || '')}</text>` : ''}</svg>`;
}

/* ---------- tiny syntax highlighter (python / js) ---------- */
function highlight(code, lang) {
  const KW = /\b(import|from|def|return|for|in|if|elif|else|class|print|const|let|var|function|await|async|True|False|None|as|with|not|and|or|while|lambda|pass|raise|try|except)\b/;
  const re = new RegExp(`(#.*|\\/\\/.*)|("""[\\s\\S]*?"""|f?"(?:\\\\.|[^"\\\\])*"|f?'(?:\\\\.|[^'\\\\])*')|${KW.source}|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b[A-Za-z_]\\w*(?=\\())`, 'g');
  let out = '', i = 0, m; code = String(code);
  while ((m = re.exec(code))) {
    out += esc(code.slice(i, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : 'f';
    out += `<span class="tk-${cls}">${esc(m[0])}</span>`; i = m.index + m[0].length;
  }
  return out + esc(code.slice(i));
}
function codeBlock(c) {
  return `<div class="code"><div class="bar"><span>${esc(c.lang)}</span><button type="button" data-copy>Copy</button></div><pre><code>${highlight(c.text, c.lang)}</code></pre><textarea class="sr" aria-hidden="true" tabindex="-1">${esc(c.text)}</textarea></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const t = b.closest('.code').querySelector('textarea').value; navigator.clipboard?.writeText(t).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1400); });
});
const flowHtml = (arr) => `<div class="flow">${arr.map((x, i) => `${i ? '<i>→</i>' : ''}<span style="animation-delay:${i * 0.12}s">${esc(x)}</span>`).join('')}</div>`;
const modeBadge = (mode, extra) => {
  const map = { real: ['real', 'REAL EXECUTION'], demo: ['demo', 'DEMO MODE · no LLM called'], llm: ['llm', 'LIVE LLM'], 'llm-draft': ['llm', 'LIVE LLM DRAFT'], guardrail: ['guardrail', 'GUARDRAIL RESPONSE'] };
  const [c, l] = map[mode] || ['demo', mode]; return `<span class="mode ${c}">${l}${extra ? ' · ' + esc(extra) : ''}</span>`;
};
