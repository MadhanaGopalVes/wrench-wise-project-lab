/* Projects listing: category filter, cards, Load More. */
renderNav(true);
const PAGE = 6; let DATA, cat = 'all', shown = PAGE;

function cardHtml(p) {
  const diff = ['Beginner', 'Moderate', 'Expert'].includes(p.difficulty) ? p.difficulty : 'all';
  return `<article class="card"><a class="thumb" href="/project/${p.id}" tabindex="-1" aria-hidden="true">${thumbSvg(p)}${p.status === 'live' ? '<span class="badge-live">● LIVE LAB</span>' : '<span class="badge-soon">COMING SOON</span>'}</a>
  <div class="body"><div class="meta"><span class="pill">${esc(p.categoryLabel)}</span><span class="pill ${diff}">${esc(p.difficulty)}</span><span class="pill dark">⏱ ${esc(p.time)}</span></div>
  <h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>
  <a class="btn ${p.status === 'live' ? '' : 'ghost'} block" href="/project/${p.id}">${p.status === 'live' ? 'View Project' : 'View Project · Get notified'}</a></div></article>`;
}
function render() {
  const list = DATA.projects.filter((p) => cat === 'all' || p.category === cat);
  list.sort((a, b) => (b.status === 'live') - (a.status === 'live'));
  const grid = $('#grid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty"><h3>Software Development projects are on the way</h3><p>The DSA and Full Stack project guides are still being built for the main Wrench Wise website. Meanwhile, try one of the AI labs.</p><button class="btn" id="goAi">Show AI/ML projects</button></div>`;
    $('#goAi').addEventListener('click', () => setCat('ml')); $('#more').innerHTML = ''; return;
  }
  grid.innerHTML = list.slice(0, shown).map(cardHtml).join('');
  $('#more').innerHTML = list.length > shown ? `<button class="btn ghost" id="loadMore">Load More Projects (${list.length - shown} more)</button>` : '';
  const lm = $('#loadMore'); if (lm) lm.addEventListener('click', () => { shown += PAGE; render(); });
}
function setCat(c) { cat = c; shown = PAGE; $$('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.cat === c)); render(); }

(async () => {
  try {
    DATA = await api('/api/catalogue');
    const tabs = [{ id: 'all', label: 'All Projects' }, ...DATA.categories];
    $('#tabs').innerHTML = tabs.map((t) => `<button class="tab" role="tab" data-cat="${t.id}" aria-selected="${t.id === 'all'}">${esc(t.label)}</button>`).join('');
    $$('.tab').forEach((t) => t.addEventListener('click', () => setCat(t.dataset.cat)));
    $('#labs').innerHTML = Object.entries(DATA.labs).map(([k, v]) => `<div class="lab-chip"><b>${esc(v)}</b>${k === 'ml' ? 'Train, evaluate and predict' : k === 'genai' ? 'RAG, analytics and document AI' : 'Agents that decide and act'}</div>`).join('');
    $('#ai-note').innerHTML = DATA.ai.mode === 'llm' ? `Live LLM enabled (${esc(DATA.ai.provider)}).` : 'Labs run real algorithms. AI text generation is clearly labelled <b>DEMO MODE</b> until an LLM key is configured.';
    render();
  } catch (e) { $('#grid').innerHTML = `<div class="empty">Could not load projects. ${esc(e.message)}</div>`; }
  try {
    const s = await api('/api/showcase');
    $('#showcase').innerHTML = s.items.length ? s.items.map((i) => `<div class="show-card"><div class="avatar">${esc(i.firstName[0])}</div><div><b>${esc(i.firstName)}</b><div class="note">completed ${esc(i.project)}</div><a href="/verify/${esc(i.id)}">Verify certificate →</a></div></div>`).join('')
      : `<div class="empty">Be the first to complete a project and appear here. Completed projects appear only when the learner opts in.</div>`;
  } catch { /* showcase is optional */ }
})();
