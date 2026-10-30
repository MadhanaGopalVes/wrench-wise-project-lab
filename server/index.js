'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('./config');
const db = require('./db');
const { q, now, sha } = db;
const sec = require('./security');
const crm = require('./crm');
const ai = require('./ai');
const A = require('./assess');
const ml = require('./ml');
const rag = require('./rag');
const pdf = require('./pdf');
const agent = require('./agent');
const catalogue = require('../content/catalogue');
const guides = require('../content/guides');
const programmes = require('../content/programmes');

const PUBLIC = path.join(cfg.ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webp': 'image/webp' };
const SECURE_COOKIE = cfg.PUBLIC_BASE_URL.startsWith('https://');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

class HttpError extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; } }
const bad = (m, extra) => new HttpError(400, m, extra);

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const data = isBuf || typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'content-type': isBuf || typeof body === 'string' ? headers['content-type'] || 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type'] || '';
    if (!ct.startsWith('application/json')) return reject(new HttpError(415, 'Content-Type must be application/json'));
    let size = 0, over = false; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 25 * 1024 * 1024) { reject(new HttpError(413, 'Request too large')); req.destroy(); return; }
      if (size > cfg.MAX_BODY_BYTES) over = true; else chunks.push(c);
    });
    req.on('end', () => { if (over) return reject(new HttpError(413, 'Request too large')); try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(bad('Invalid JSON')); } });
    req.on('error', reject);
  });
}
const parseCookies = (h) => Object.fromEntries((h || '').split(';').map((s) => s.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const clientIp = (req) => (TRUST_PROXY && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress || 'ip');

function sessionCookie(token, maxAge) {
  return `ww_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`;
}
function authenticate(req) {
  const t = parseCookies(req.headers.cookie).ww_session; if (!t) return null;
  const s = q.one('SELECT learner_id, expires_at FROM sessions WHERE token_hash=?', sha(t));
  if (!s || s.expires_at < now()) return null;
  return q.one('SELECT * FROM learners WHERE id=?', s.learner_id) || null;
}
function createSession(res, learnerId) {
  const token = crypto.randomBytes(32).toString('hex'); const days = cfg.SESSION_DAYS;
  q.run('INSERT INTO sessions(token_hash,learner_id,created_at,expires_at) VALUES(?,?,?,?)', sha(token), learnerId, now(), new Date(Date.now() + days * 864e5).toISOString());
  return sessionCookie(token, days * 86400);
}
const publicLearner = (l) => ({ id: l.id, name: l.name, email: l.email, marketingConsent: !!l.marketing_consent });
const needLearner = (ctx) => { if (!ctx.learner) throw new HttpError(401, 'Please register to unlock this project', { code: 'REGISTRATION_REQUIRED' }); return ctx.learner; };
function needLiveProject(id) {
  const p = catalogue.byId(id); if (!p) throw new HttpError(404, 'Project not found');
  if (p.status !== 'live' || !guides.get(id)) throw new HttpError(409, 'This project is coming soon');
  return p;
}
const saveRun = (learnerId, projectId, kind, payload) => q.run('INSERT INTO runs(learner_id,project_id,kind,payload,ts) VALUES(?,?,?,?,?)', learnerId, projectId, kind, JSON.stringify(payload), now()).lastInsertRowid;
const lastRun = (learnerId, projectId, kind) => { const r = q.one('SELECT payload FROM runs WHERE learner_id=? AND project_id=? AND kind=? ORDER BY id DESC LIMIT 1', learnerId, projectId, kind); return r ? JSON.parse(r.payload) : null; };
function quota(learner, cost = 1) {
  const r = sec.useQuota(learner.id, cost);
  if (!r.ok) throw new HttpError(429, `Daily lab usage limit reached (${r.limit}). Please try again tomorrow.`, { code: 'QUOTA' });
  return r;
}

// ---------- RAG document store ----------
function loadDoc(learner, docId) {
  if (typeof docId === 'string' && docId.startsWith('sample:')) {
    const s = rag.SAMPLES[docId.slice(7)]; if (!s) throw bad('Unknown sample'); return { name: s.name, pages: s.pages, sample: docId.slice(7) };
  }
  const r = q.one(`SELECT payload FROM runs WHERE learner_id=? AND project_id='pdf-chatbot' AND kind='rag-document' AND json_extract(payload,'$.docId')=? ORDER BY id DESC LIMIT 1`, learner.id, String(docId));
  if (!r) throw new HttpError(404, 'Document not found. Please upload it again.');
  return JSON.parse(r.payload);
}
const chunkOpts = (b) => ({ chunkSize: b.chunkSize, overlap: b.overlap, strategy: b.strategy === 'paragraph' ? 'paragraph' : 'fixed' });
const chunkSizeOf = (b) => Math.min(400, Math.max(20, Math.round(+b.chunkSize || 120)));

// ---------- API route table ----------
const routes = [];
const route = (method, pattern, handler, opts = {}) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler, opts });

route('GET', '/api/catalogue', async () => ({ categories: catalogue.CATEGORIES, labs: catalogue.LABS, projects: catalogue.PROJECTS.map(catalogue.card), ai: ai.status(), brand: { name: 'WRENCH WISE PROJECT LAB', tagline: 'Explore. Experiment. Build. Achieve.' } }));
route('GET', '/api/projects/:id', async (c) => { const p = guides.preview(c.params.id); if (!p) throw new HttpError(404, 'Project not found'); return { project: p, learner: c.learner ? publicLearner(c.learner) : null, unlocked: !!c.learner && p.status === 'live' }; });

route('POST', '/api/event', async (c) => {
  const { type, projectId, anon } = c.body;
  if (!['project_viewed', 'related_course_viewed'].includes(type)) throw bad('Unsupported event');
  if (projectId && !catalogue.byId(projectId)) throw bad('Unknown project');
  A.track(type, c.learner ? c.learner.id : null, projectId, { anon: String(anon || '').slice(0, 40) });
  return { ok: true };
});

route('POST', '/api/register', async (c) => {
  const b = c.body; const name = sec.cleanText(b.name, 80); const email = String(b.email || '').trim().toLowerCase(); const phone = sec.normPhone(b.phone);
  if (name.length < 2) throw bad('Please enter your full name', { field: 'name' });
  if (!sec.validEmail(email)) throw bad('Please enter a valid email address', { field: 'email' });
  if (!phone) throw bad('Please enter a valid phone number (8-15 digits)', { field: 'phone' });
  if (b.consent !== true) throw bad('Please accept the privacy notice to continue', { field: 'consent' });
  const proj = b.projectId ? catalogue.byId(b.projectId) : null;
  if (b.projectId && !proj) throw bad('Unknown project');
  let l = q.one('SELECT * FROM learners WHERE email=?', email);
  const returning = !!l;
  if (l) {
    if (l.phone !== phone) throw new HttpError(409, 'This email is already registered. Please use the same phone number you registered with.', { field: 'phone' });
    if (b.marketing === true && !l.marketing_consent) q.run('UPDATE learners SET marketing_consent=1 WHERE id=?', l.id);
  } else {
    const id = q.run('INSERT INTO learners(name,email,phone,marketing_consent,privacy_consent_at,source,created_at,last_activity) VALUES(?,?,?,?,?,?,?,?)',
      name, email, phone, b.marketing === true ? 1 : 0, now(), sec.cleanText(b.source || 'project-lab', 40), now(), now()).lastInsertRowid;
    l = q.one('SELECT * FROM learners WHERE id=?', id);
    A.track('registration_completed', l.id, proj ? proj.id : null, { source: l.source });
  }
  const cookie = createSession(c.res, l.id);
  if (proj && proj.status !== 'live') {
    q.run('INSERT OR IGNORE INTO waitlist(email,project_id,created_at) VALUES(?,?,?)', email, proj.id, now());
    A.track('waitlist_joined', l.id, proj.id);
    return { learner: publicLearner(l), unlocked: false, waitlisted: true, _headers: { 'set-cookie': cookie } };
  }
  return { learner: publicLearner(l), unlocked: true, returning, _headers: { 'set-cookie': cookie } };
}, { limit: 'register' });

route('GET', '/api/me', async (c) => {
  if (!c.learner) return { learner: null };
  const rows = q.all('SELECT project_id, completed_at FROM progress WHERE learner_id=?', c.learner.id);
  const certs = q.all('SELECT id, project_id, project_title, issued_at FROM certificates WHERE learner_id=? AND revoked=0', c.learner.id);
  return { learner: publicLearner(c.learner), projects: rows.map((r) => ({ id: r.project_id, completed: !!r.completed_at })), certificates: certs };
});
route('POST', '/api/logout', async (c) => {
  const t = parseCookies(c.req.headers.cookie).ww_session; if (t) q.run('DELETE FROM sessions WHERE token_hash=?', sha(t));
  return { ok: true, _headers: { 'set-cookie': sessionCookie('', 0) } };
});
// Privacy: learners can erase their data. Certificates are removed too (verification will then fail).
route('POST', '/api/me/delete', async (c) => {
  const l = needLearner(c); if (c.body.confirm !== 'DELETE') throw bad('Send {"confirm":"DELETE"}');
  q.run('DELETE FROM waitlist WHERE email=?', l.email); q.run('DELETE FROM events WHERE learner_id=?', l.id);
  q.run('DELETE FROM learners WHERE id=?', l.id);
  return { ok: true, _headers: { 'set-cookie': sessionCookie('', 0) } };
});

// ----- guide, progress, assessment -----
route('GET', '/api/projects/:id/guide', async (c) => {
  const l = needLearner(c); needLiveProject(c.params.id);
  A.startProject(l.id, c.params.id);
  return { guide: guides.publicGuide(c.params.id), status: A.status(l.id, c.params.id), ai: ai.status() };
});
route('GET', '/api/projects/:id/status', async (c) => { const l = needLearner(c); needLiveProject(c.params.id); return { status: A.status(l.id, c.params.id) }; });
route('POST', '/api/projects/:id/step', async (c) => { const l = needLearner(c); needLiveProject(c.params.id); return { status: A.setStep(l.id, c.params.id, Number(c.body.idx), c.body.done !== false) }; });
route('POST', '/api/projects/:id/check', async (c) => { const l = needLearner(c); needLiveProject(c.params.id); return A.answerCheck(l.id, c.params.id, String(c.body.id), c.body.choice); });
route('POST', '/api/projects/:id/quiz', async (c) => { const l = needLearner(c); needLiveProject(c.params.id); try { return A.submitQuiz(l.id, c.params.id, c.body.answers); } catch (e) { throw bad(e.message); } });
route('POST', '/api/projects/:id/certificate', async (c) => {
  const l = needLearner(c); needLiveProject(c.params.id);
  try { const cert = A.issueCertificate(l.id, c.params.id, { showcase: c.body.showcase === true }); return { certificate: { id: cert.id, issued_at: cert.issued_at, url: `${cfg.PUBLIC_BASE_URL}/verify/${cert.id}` } }; }
  catch (e) { throw new HttpError(e.status || 400, e.message, { gates: e.gates }); }
});
route('GET', '/api/certificate/:id', async (c) => { const v = A.verify(c.params.id); if (!v.valid) throw new HttpError(404, v.reason); return { ...v, verifyUrl: `${cfg.PUBLIC_BASE_URL}/verify/${v.id}` }; });
route('GET', '/api/verify/:id', async (c) => ({ ...A.verify(c.params.id), verifyUrl: `${cfg.PUBLIC_BASE_URL}/verify/${c.params.id}` }));
route('GET', '/api/showcase', async () => ({ items: q.all(`SELECT c.id, c.project_title, c.issued_at, l.name FROM certificates c JOIN learners l ON l.id=c.learner_id WHERE c.showcase=1 AND c.revoked=0 ORDER BY c.issued_at DESC LIMIT 6`).map((r) => ({ id: r.id, project: r.project_title, issued_at: r.issued_at, firstName: r.name.split(' ')[0] })) }));

route('POST', '/api/lab/record', async (c) => {
  const l = needLearner(c);
  const { projectId, kind, payload } = c.body || {};
  if (!projectId || !kind) throw bad('Missing projectId or kind');
  const id = saveRun(l.id, projectId, kind, payload || {});
  return { ok: true, runId: id };
});

// ----- programmes -----
route('GET', '/api/programme/:slug', async (c) => { const p = Object.values(programmes).find((x) => x.slug === c.params.slug); if (!p) throw new HttpError(404, 'Programme not found'); return { programme: p, websiteLive: !!cfg.PROGRAMME_BASE_URL }; });

// ----- ML lab -----
route('GET', '/api/lab/ml/dataset', async (c) => { const l = needLearner(c); needLiveProject('ml-model-builder'); if (!lastRun(l.id, 'ml-model-builder', 'ml-explore')) saveRun(l.id, 'ml-model-builder', 'ml-explore', { at: now() }); return { ...ml.describe(), algorithms: ml.ALGOS }; });
route('POST', '/api/lab/ml/train', async (c) => {
  const l = needLearner(c); needLiveProject('ml-model-builder');
  const b = c.body; const seed = Math.round(Number(b.seed)) || 7;
  let out; try { out = ml.train({ features: b.features, algorithm: b.algorithm, params: b.params || {}, testSize: b.testSize, seed }); } catch (e) { throw bad(e.message); }
  const r = out.result;
  saveRun(l.id, 'ml-model-builder', 'ml-train', { algorithm: r.algorithm, params: r.params, features: r.features, testSize: r.testSize, seed, train: r.train, test: r.test });
  return { result: r, execution: { mode: 'real', note: 'Real training on the synthetic housing dataset (no pre-baked results).' } };
});
route('POST', '/api/lab/ml/predict', async (c) => {
  const l = needLearner(c); needLiveProject('ml-model-builder');
  const last = lastRun(l.id, 'ml-model-builder', 'ml-train'); if (!last) throw bad('Train a model first');
  const { model } = ml.train({ features: last.features, algorithm: last.algorithm, params: last.params, testSize: last.testSize, seed: last.seed });
  let price; try { price = ml.predict(model, c.body.values || {}); } catch (e) { throw bad(e.message); }
  saveRun(l.id, 'ml-model-builder', 'ml-predict', { price });
  return { price, unit: 'US$ thousand', model: { algorithm: last.algorithm, features: last.features, testMae: last.test.mae } };
});
route('POST', '/api/lab/ml/experiment', async (c) => {
  const l = needLearner(c); needLiveProject('ml-model-builder'); quota(l, 2);
  const feats = Array.isArray(c.body.features) && c.body.features.length ? c.body.features : ['sqft', 'bedrooms', 'bathrooms', 'age', 'distance_km', 'garage', 'school_score'];
  const t = (algorithm, features, params) => { const r = ml.train({ features, algorithm, params }).result; return { label: r.label + (r.params && Object.keys(r.params).length ? ' ' + JSON.stringify(r.params) : ''), features: features.length, trainR2: r.train.r2, testR2: r.test.r2, testMae: r.test.mae, gap: +(r.train.r2 - r.test.r2).toFixed(3) }; };
  let rows;
  switch (c.body.id) {
    case 'algo-compare': rows = [t('linear', feats, {}), t('ridge', feats, { alpha: 50 }), t('tree', feats, { max_depth: 6 }), t('knn', feats, { k: 7 })]; break;
    case 'noise-feature': { const base = feats.filter((f) => f !== 'random_noise'); rows = [{ ...t('tree', base, { max_depth: 10 }), label: 'Tree depth 10 WITHOUT noise feature' }, { ...t('tree', [...base, 'random_noise'], { max_depth: 10 }), label: 'Tree depth 10 WITH noise feature' }, { ...t('linear', base, {}), label: 'Linear WITHOUT noise feature' }, { ...t('linear', [...base, 'random_noise'], {}), label: 'Linear WITH noise feature' }]; break; }
    case 'depth-sweep': rows = [1, 2, 3, 4, 6, 8, 10, 12].map((d) => ({ ...t('tree', feats, { max_depth: d }), label: `Tree depth ${d}` })); break;
    default: throw bad('Unknown experiment');
  }
  return { columns: [['label', 'Model'], ['features', 'Features'], ['trainR2', 'Train R²'], ['testR2', 'Test R²'], ['testMae', 'Test MAE'], ['gap', 'Train−Test gap']], rows, execution: { mode: 'real' } };
});

// ----- RAG lab -----
route('GET', '/api/lab/rag/samples', async (c) => { needLearner(c); needLiveProject('pdf-chatbot'); return { samples: Object.entries(rag.SAMPLES).map(([id, s]) => ({ id, name: s.name, pages: s.pages.length, questions: s.questions })), ai: ai.status(), maxUploadMb: cfg.MAX_UPLOAD_BYTES / 1048576 }; });
route('GET', '/api/lab/rag/sample/:id', async (c) => {
  needLearner(c); const id = c.params.id.replace(/\.pdf$/, ''); const s = rag.SAMPLES[id]; if (!s) throw new HttpError(404, 'Unknown sample');
  c.raw = { type: 'application/pdf', body: pdf.buildPdf(s.pages), disposition: `attachment; filename="${id}-sample.pdf"` };
});
route('POST', '/api/lab/rag/document', async (c) => {
  const l = needLearner(c); needLiveProject('pdf-chatbot'); let doc;
  if (c.body.sampleId) {
    const s = rag.SAMPLES[c.body.sampleId]; if (!s) throw bad('Unknown sample');
    doc = { docId: 'sample:' + c.body.sampleId, name: s.name, pages: s.pages, sample: c.body.sampleId, extraction: { method: 'built-in sample text' } };
    saveRun(l.id, 'pdf-chatbot', 'rag-document', { docId: doc.docId, sample: true });
  } else {
    const v = sec.validateUpload({ filename: String(c.body.filename || ''), dataBase64: String(c.body.dataBase64 || '') });
    if (!v.ok) throw bad(v.error);
    let pages;
    if (v.kind === 'pdf') { const r = pdf.extractPdf(v.buf); if (!r.ok) throw bad(r.error); pages = r.pages; }
    else pages = v.buf.toString('utf8').split(/\n{2,}/).reduce((a, p) => { const last = a[a.length - 1]; if (last && last.split(/\s+/).length < 150) a[a.length - 1] = last + '\n' + p; else a.push(p); return a; }, []);
    pages = pages.map((p) => p.slice(0, 20000)).slice(0, 60);
    if (pages.join('').trim().length < 40) throw bad('Not enough text found in the file');
    doc = { docId: crypto.randomBytes(6).toString('hex'), name: sec.cleanText(c.body.filename, 80), pages, extraction: { method: v.kind === 'pdf' ? 'pdf text-stream extractor' : 'plain text' } };
    saveRun(l.id, 'pdf-chatbot', 'rag-document', { docId: doc.docId, name: doc.name, pages: doc.pages });
  }
  const words = doc.pages.join(' ').split(/\s+/).length;
  return { docId: doc.docId, name: doc.name, pages: doc.pages, stats: { pages: doc.pages.length, words }, extraction: doc.extraction, execution: { mode: 'real' } };
});
route('POST', '/api/lab/rag/chunk', async (c) => {
  const l = needLearner(c); needLiveProject('pdf-chatbot'); const d = loadDoc(l, c.body.docId);
  const chunks = rag.chunkDocument(d.pages, chunkOpts(c.body));
  saveRun(l.id, 'pdf-chatbot', 'rag-chunk', { chunkSize: chunkSizeOf(c.body), n: chunks.length });
  return { chunks, execution: { mode: 'real' } };
});
route('POST', '/api/lab/rag/embed', async (c) => {
  const l = needLearner(c); needLiveProject('pdf-chatbot'); const d = loadDoc(l, c.body.docId);
  const chunks = rag.chunkDocument(d.pages, chunkOpts(c.body)); const e = rag.embed(chunks);
  saveRun(l.id, 'pdf-chatbot', 'rag-embed', { chunkSize: chunkSizeOf(c.body), n: chunks.length });
  return { vocab: e.vocab, chunks: chunks.map((ch, i) => ({ id: ch.id, page: ch.page, nonZero: e.vecs[i].size, topTerms: [...e.vecs[i].entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, w]) => ({ term: t, weight: +w.toFixed(3) })) })), method: 'TF-IDF sparse vectors (lexical, computed locally)', execution: { mode: 'real' } };
});
route('POST', '/api/lab/rag/ask', async (c) => {
  const l = needLearner(c); needLiveProject('pdf-chatbot'); const d = loadDoc(l, c.body.docId); quota(l);
  const question = String(c.body.question || '').trim().slice(0, 400); if (question.length < 3) throw bad('Ask a question');
  const chunks = rag.chunkDocument(d.pages, chunkOpts(c.body));
  let out; try { out = await rag.answer(chunks, question, { topK: c.body.topK, threshold: c.body.threshold }); } catch (e) { throw new HttpError(502, 'The AI provider failed. Please retry.'); }
  saveRun(l.id, 'pdf-chatbot', 'rag-ask', { refused: out.refused, maxScore: out.maxScore, sources: out.refused ? 0 : out.retrieval.length, chunkSize: chunkSizeOf(c.body), mode: out.mode });
  return { ...out, injectionFlagged: sec.detectInjection(question), execution: { mode: out.mode === 'llm' ? 'llm' : out.mode === 'demo' ? 'demo' : 'guardrail', llm: out.llm } };
});
route('POST', '/api/lab/rag/experiment', async (c) => {
  const l = needLearner(c); needLiveProject('pdf-chatbot'); quota(l, 2);
  const sample = rag.SAMPLES.handbook; const [good, , bad2] = sample.questions; const pages = sample.pages;
  const ask = (chunks, qn, o) => rag.retrieve(chunks, qn, o);
  let rows, columns;
  if (c.body.id === 'chunk-sweep') {
    columns = [['size', 'Chunk size (words)'], ['n', 'Chunks'], ['score', 'Top similarity'], ['top', 'Top chunk begins…']];
    rows = [20, 40, 80, 120, 200].map((size) => { const ch = rag.chunkDocument(pages, { chunkSize: size, overlap: Math.round(size / 6) }); const r = ask(ch, good.q, { topK: 1 }); return { size, n: ch.length, score: r.maxScore, top: r.top[0].text.slice(0, 70) + '…' }; });
  } else if (c.body.id === 'threshold-sweep') {
    columns = [['threshold', 'Threshold'], ['good', `Answerable: "${good.q}"`], ['bad', `Unanswerable: "${bad2.q}"`]];
    const ch = rag.chunkDocument(pages, {}); const g = ask(ch, good.q, {}).maxScore, b = ask(ch, bad2.q, {}).maxScore;
    rows = [0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4].map((t) => ({ threshold: t, good: g >= t ? `Answered (score ${g})` : `Refused (score ${g})`, bad: b >= t ? `Answered from weak evidence (score ${b})` : `Correctly refused (score ${b})` }));
  } else if (c.body.id === 'topk-compare') {
    columns = [['k', 'Top-k'], ['sources', 'Chunks sent to answerer'], ['weak', 'Of which weakly relevant (<50% of best)'], ['scores', 'Scores']];
    const ch = rag.chunkDocument(pages, {}); const all = ask(ch, good.q, { topK: 8 }).all;
    rows = [1, 2, 3, 5].map((k) => { const top = all.slice(0, k); return { k, sources: top.length, weak: top.filter((t) => t.score < all[0].score * 0.5).length, scores: top.map((t) => t.score).join(', ') }; });
  } else throw bad('Unknown experiment');
  return { columns, rows, execution: { mode: 'real', note: 'Run on the sample handbook with TF-IDF retrieval.' } };
});

// ----- Agent lab -----
route('GET', '/api/lab/agent/config', async (c) => { needLearner(c); needLiveProject('support-agent'); return { scenarios: agent.SCENARIOS, tools: agent.TOOLS, ai: ai.status(), maxSteps: cfg.AGENT_MAX_STEPS, kb: agent.KB.map((k) => ({ id: k.id, title: k.title })), orders: Object.keys(agent.ORDERS) }; });
async function doAgentRun(l, message, enabledTools) {
  const known = Object.keys(agent.TOOLS);
  const enabled = Array.isArray(enabledTools) ? enabledTools.filter((t) => known.includes(t)) : known;
  const r = await agent.run({ message, enabledTools: enabled.length ? enabled : ['draft_response'] });
  const state = { status: r.status, trace: r.trace, ctx: r.ctx, pending: r.pending || null, final: r.final, calls: r.calls,
    injection: r.trace.some((s) => s.actor === 'guardrail' && /injection/i.test(s.summary)), guardrail: r.trace.some((s) => s.actor === 'guardrail'),
    disabled: known.length - enabled.length, outcomeKind: r.status === 'escalated' ? 'escalated' : r.ctx.ticket ? 'ticket' : null };
  return state;
}
route('POST', '/api/lab/agent/run', async (c) => {
  const l = needLearner(c); needLiveProject('support-agent'); quota(l);
  const message = String(c.body.message || '').trim(); if (message.length < 3) throw bad('Enter a customer message');
  const state = await doAgentRun(l, message, c.body.enabledTools);
  const runId = saveRun(l.id, 'support-agent', 'agent-run', state);
  return { runId, status: state.status, trace: state.trace, final: state.final, pending: state.pending, calls: state.calls,
    execution: { mode: state.final && state.final.mode === 'llm' ? 'llm-draft' : 'demo', planner: 'rule-based policy (deterministic)', note: 'Tools run for real over synthetic data. Tool selection is rule-based; the reply is a template unless an LLM key is configured.', llm: ai.status() } };
});
route('POST', '/api/lab/agent/decide', async (c) => {
  const l = needLearner(c); needLiveProject('support-agent');
  const row = q.one(`SELECT id, payload FROM runs WHERE id=? AND learner_id=? AND kind='agent-run'`, Number(c.body.runId), l.id); if (!row) throw new HttpError(404, 'Run not found');
  const state = JSON.parse(row.payload); if (state.status !== 'awaiting_approval') throw new HttpError(409, 'This run is not waiting for approval');
  const approve = c.body.approve === true;
  const next = await agent.decide(state, approve);
  q.run('UPDATE runs SET payload=? WHERE id=?', JSON.stringify(next), row.id);
  saveRun(l.id, 'support-agent', 'agent-decision', { runId: row.id, approve });
  return { runId: row.id, status: next.status, trace: next.trace, final: next.final, outcome: next.outcome };
});
route('POST', '/api/lab/agent/experiment', async (c) => {
  const l = needLearner(c); needLiveProject('support-agent'); quota(l, 2);
  const tools = Object.keys(agent.TOOLS); const s2 = agent.SCENARIOS[1]; let rows;
  const summarise = (label, st) => ({ label, status: st.status, tools: [...new Set(st.trace.filter((x) => x.tool && x.actor === 'agent').map((x) => x.tool))].join(', ') || '-', blocked: st.trace.filter((x) => x.output && x.output.error === 'tool_not_permitted').length, reply: (st.final.text || '').slice(0, 90) + '…' });
  if (c.body.id === 'tool-ablation') {
    rows = [summarise('All tools enabled', await doAgentRun(l, s2.message, tools))];
    for (const t of tools) rows.push(summarise(`Without ${t}`, await doAgentRun(l, s2.message, tools.filter((x) => x !== t))));
  } else if (c.body.id === 'scenario-matrix') {
    rows = []; for (const s of agent.SCENARIOS) rows.push(summarise(s.title, await doAgentRun(l, s.message, tools)));
  } else throw bad('Unknown experiment');
  return { columns: [['label', 'Case'], ['status', 'Status'], ['tools', 'Tools used'], ['blocked', 'Blocked calls'], ['reply', 'Reply']], rows, execution: { mode: 'real', note: 'Tools executed over synthetic data. Experiment runs do not count toward your challenge.' } };
});

// ----- Admin -----
function needAdmin(req) {
  const t = req.headers['x-admin-token'];
  if (!cfg.ADMIN_TOKEN) throw new HttpError(503, 'Admin is disabled: set ADMIN_TOKEN');
  const a = Buffer.from(String(t || '')), b = Buffer.from(cfg.ADMIN_TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(401, 'Invalid admin token');
}
route('GET', '/api/admin/analytics', async (c) => {
  needAdmin(c.req);
  const live = catalogue.PROJECTS.filter((p) => p.status === 'live');
  const count = (type, pid) => q.one(`SELECT COUNT(DISTINCT COALESCE(learner_id, anon_id)) n FROM events WHERE type=? ${pid ? 'AND project_id=?' : ''}`, ...(pid ? [type, pid] : [type])).n;
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
  const projects = live.map((p) => {
    const views = count('project_viewed', p.id), reg = q.one(`SELECT COUNT(DISTINCT learner_id) n FROM events WHERE type='project_started' AND project_id=?`, p.id).n;
    const regs = q.one(`SELECT COUNT(DISTINCT learner_id) n FROM progress WHERE project_id=?`, p.id).n || reg;
    const started = count('first_checkpoint_completed', p.id), completed = count('project_completed', p.id), passed = count('assessment_passed', p.id);
    const attempted = q.one('SELECT COUNT(DISTINCT learner_id) n FROM attempts WHERE project_id=?', p.id).n;
    const certs = q.one('SELECT COUNT(*) n FROM certificates WHERE project_id=? AND revoked=0', p.id).n;
    const course = count('related_course_viewed', p.id);
    return { id: p.id, title: p.title, views, unlocked: regs, activation: pct(started, regs), completionRate: pct(completed, regs), assessmentPassRate: pct(passed, attempted), certificates: certs, courseViews: course, courseEnquiryRate: pct(course, regs) };
  });
  const totalLearners = q.one('SELECT COUNT(*) n FROM learners').n;
  const repeat = q.one('SELECT COUNT(*) n FROM (SELECT learner_id FROM progress GROUP BY learner_id HAVING COUNT(*)>1)').n;
  const enrolled = q.one('SELECT COUNT(*) n FROM learners l JOIN enrolments e ON e.email=l.email').n;
  const enrolRows = q.one('SELECT COUNT(*) n FROM enrolments').n;
  return {
    totals: { learners: totalLearners, certificates: q.one('SELECT COUNT(*) n FROM certificates WHERE revoked=0').n, repeatParticipants: repeat, repeatRate: pct(repeat, totalLearners), marketingConsent: q.one('SELECT COUNT(*) n FROM learners WHERE marketing_consent=1').n, waitlist: q.one('SELECT COUNT(*) n FROM waitlist').n },
    projects, enrolmentConversion: enrolRows ? { enrolled, rate: pct(enrolled, totalLearners) } : { enrolled: null, rate: null, note: 'No sales data imported yet. POST /api/admin/enrolments with emails.' },
    registrationsByProject: q.all(`SELECT project_id, COUNT(*) n FROM events WHERE type='registration_completed' GROUP BY project_id`),
    eventCounts: q.all('SELECT type, COUNT(*) n FROM events GROUP BY type ORDER BY n DESC'),
    crm: { ...crm.info(), pending: q.one(`SELECT COUNT(*) n FROM outbox WHERE status='pending'`).n, sent: q.one(`SELECT COUNT(*) n FROM outbox WHERE status='sent'`).n, failed: q.one(`SELECT COUNT(*) n FROM outbox WHERE status='failed'`).n },
    ai: ai.status(),
  };
});
route('POST', '/api/admin/enrolments', async (c) => {
  needAdmin(c.req); const list = Array.isArray(c.body.emails) ? c.body.emails.slice(0, 5000) : [];
  for (const e of list) if (sec.validEmail(String(e))) q.run('INSERT OR REPLACE INTO enrolments(email,programme,imported_at) VALUES(?,?,?)', String(e).toLowerCase(), c.body.programme || null, now());
  return { imported: list.length };
});
route('POST', '/api/admin/crm/flush', async (c) => { needAdmin(c.req); return await crm.flush(100); });
route('GET', '/api/admin/leads', async (c) => { needAdmin(c.req); return { leads: q.all('SELECT id FROM learners ORDER BY last_activity DESC LIMIT 100').flatMap((r) => { const rows = q.all('SELECT project_id FROM progress WHERE learner_id=?', r.id); return rows.length ? rows.map((p) => crm.leadRecord(r.id, p.project_id)) : [crm.leadRecord(r.id, null)]; }) }; });

// ---------- Programme redirect (logs the "related course page viewed" event) ----------
function programmeRedirect(req, res, url) {
  const m = /^\/go\/([a-z0-9-]+)$/.exec(url.pathname); if (!m) return false;
  const prog = Object.values(programmes).find((p) => p.slug === m[1]); if (!prog) { send(res, 404, 'Not found'); return true; }
  const learner = authenticate(req); const pid = url.searchParams.get('project'); const intent = url.searchParams.get('intent') === 'syllabus' ? 'syllabus' : 'enroll';
  A.track('related_course_viewed', learner ? learner.id : null, catalogue.byId(pid) ? pid : null, { intent, programme: prog.slug });
  const target = cfg.PROGRAMME_BASE_URL ? `${cfg.PROGRAMME_BASE_URL.replace(/\/$/, '')}/${prog.slug}?utm_source=project-lab&intent=${intent}` : `/programme/${prog.slug}?intent=${intent}`;
  res.writeHead(302, { location: target }); res.end(); return true;
}

// ---------- Static ----------
const PAGES = [[/^\/$/, 'index.html'], [/^\/project\/[a-z0-9-]+$/, 'project.html'], [/^\/certificate\/[A-Za-z0-9-]+$/, 'certificate.html'], [/^\/verify(\/[A-Za-z0-9-]+)?$/, 'verify.html'], [/^\/admin$/, 'admin.html'], [/^\/programme\/[a-z0-9-]+$/, 'programme.html']];
function serveStatic(req, res, pathname) {
  let file = null;
  for (const [re, f] of PAGES) if (re.test(pathname)) file = path.join(PUBLIC, f);
  if (!file) { const p = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname))); if (!p.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Forbidden'); file = p; }
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=300' }); res.end(buf);
  });
}

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
function setHeaders(res) {
  res.setHeader('Content-Security-Policy', CSP); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('X-Frame-Options', 'DENY');
}

function proxyToGateway(req, res, targetPath) {
  const options = {
    hostname: '127.0.0.1',
    port: 8080,
    path: targetPath || req.url,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:8080' }
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'AI Gateway not running', details: err.message }));
  });
  req.pipe(proxyReq, { end: true });
}

async function handler(req, res) {
  setHeaders(res);
  const url = new URL(req.url, 'http://x'); const ip = clientIp(req);
  try {
    if (
      url.pathname.startsWith('/api/churn/') ||
      url.pathname.startsWith('/api/vision/') ||
      url.pathname.startsWith('/api/recommender/') ||
      url.pathname === '/api/system/status' ||
      url.pathname.startsWith('/churn') ||
      url.pathname.startsWith('/vision') ||
      url.pathname.startsWith('/recommender') ||
      url.pathname.startsWith('/portal') ||
      url.pathname.startsWith('/sample-images')
    ) {
      return proxyToGateway(req, res, req.url);
    }

    if (!url.pathname.startsWith('/api/')) {
      if (programmeRedirect(req, res, url)) return;
      return serveStatic(req, res, url.pathname);
    }
    if (!sec.rateLimit(`g:${ip}`, cfg.RATE_LIMIT_PER_MIN, 60e3)) throw new HttpError(429, 'Too many requests. Please slow down.');
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    for (const r of routes) {
      if (r.method !== method) continue; const m = r.re.exec(url.pathname); if (!m) continue;
      if (method !== 'GET' && !sec.rateLimit(`w:${ip}`, cfg.RATE_LIMIT_WRITE_PER_MIN, 60e3)) throw new HttpError(429, 'Too many requests. Please slow down.');
      if (r.opts.limit === 'register' && !sec.rateLimit(`r:${ip}`, cfg.RATE_LIMIT_REGISTER_PER_HOUR, 3600e3)) throw new HttpError(429, 'Too many registration attempts. Please try later.');
      const ctx = { req, res, params: m.groups || {}, query: url.searchParams, learner: authenticate(req), body: method === 'POST' ? await readBody(req) : {} };
      const out = await r.handler(ctx);
      if (ctx.raw) return send(res, 200, ctx.raw.body, { 'content-type': ctx.raw.type, 'content-disposition': ctx.raw.disposition });
      const { _headers, ...body } = out || {};
      return send(res, 200, body, _headers || {});
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message, ...(e.extra || {}) });
    console.error('Unhandled error:', e);
    return send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}

function createServer() { db.open(); return http.createServer(handler); }
if (require.main === module) {
  const server = createServer(); crm.start();
  if (cfg.CERT_SECRET.startsWith('dev-only')) console.warn('WARNING: CERT_SECRET is the development default. Set it before deploying.');
  server.listen(cfg.PORT, () => console.log(`Wrench Wise Project Lab running at ${cfg.PUBLIC_BASE_URL}  (AI: ${ai.status().mode}, CRM: ${cfg.CRM_PROVIDER})`));
}
module.exports = { createServer };
